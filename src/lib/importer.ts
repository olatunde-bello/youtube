import "server-only";
// Imports a channel's videos and daily history. Work is done in small,
// resumable chunks so each request finishes well inside Vercel's time limit;
// the Settings page keeps calling until nothing is left.
import { BASE_METRICS, parseDailyReport, REVENUE_METRIC, type DailyMetrics } from "./analytics-parse";
import { decryptToken, encryptToken } from "./crypto";
import { dateChunks, pacificDayOf, todayPacific } from "./dates";
import {
  listChannelsWithTokens,
  logSync,
  markVideoHistoryDone,
  updateChannel,
  upsertChannel,
  upsertChannelDaily,
  upsertVideoDaily,
  upsertVideos,
  videoCounts,
  videosNeedingHistory,
  type ChannelRow,
} from "./db";
import { env } from "./env";
import { analyticsReport, getMyChannel, getVideos, GoogleApiError, listUploadIds, refreshAccessToken } from "./google";
import { parseScopes, REVENUE_SCOPE } from "./scopes";
import { toVideoRow } from "./videos";

const VIDEO_CONCURRENCY = 4;

/** Context for one channel during one request. */
type ChannelCtx = { channel: ChannelRow; accessToken: string; revenue: ChannelRow["revenue_status"] };

/**
 * Fetches daily metrics. Revenue is requested only if the channel granted the
 * revenue scope and hasn't been found to lack revenue. If YouTube refuses the
 * revenue metric (e.g. channel isn't monetised), we retry without it and leave
 * revenue as NULL ("not available"), never 0.
 */
async function fetchDaily(ctx: ChannelCtx, startDate: string, endDate: string, filters?: string): Promise<DailyMetrics[]> {
  const base = { startDate, endDate, dimensions: "day", sort: "day", filters };
  if (ctx.revenue !== "unavailable") {
    try {
      const rows = parseDailyReport(await analyticsReport(ctx.accessToken, { ...base, metrics: [...BASE_METRICS, REVENUE_METRIC] }));
      if (ctx.revenue !== "available") {
        ctx.revenue = "available";
        await updateChannel(ctx.channel.id, { revenue_status: "available" });
      }
      return rows;
    } catch (e) {
      if (!(e instanceof GoogleApiError) || e.status !== 403) throw e;
      ctx.revenue = "unavailable";
      await updateChannel(ctx.channel.id, { revenue_status: "unavailable" });
    }
  }
  return parseDailyReport(await analyticsReport(ctx.accessToken, { ...base, metrics: BASE_METRICS }));
}

async function openChannel(channel: ChannelRow): Promise<ChannelCtx | null> {
  try {
    const accessToken = await refreshAccessToken(decryptToken(channel.refresh_token_enc, env.appSecret));
    const hasRevenueScope = parseScopes(channel.granted_scopes).includes(REVENUE_SCOPE);
    return { channel, accessToken, revenue: hasRevenueScope ? channel.revenue_status : "unavailable" };
  } catch (e) {
    if (e instanceof GoogleApiError && e.needsReconnect) {
      await updateChannel(channel.id, {
        connection_status: "needs_reconnect",
        last_sync_ok: false,
        last_sync_message: "Google sign-in expired. Click Reconnect.",
      });
      return null;
    }
    throw e;
  }
}

/** Step A: video list + channel-level daily history. */
async function importChannelBasics(ctx: ChannelCtx) {
  const { channel, accessToken } = ctx;
  const ids = await listUploadIds(accessToken, channel.uploads_playlist_id);
  const videos = (await getVideos(accessToken, ids)).map((v) => toVideoRow(channel.id, v)).filter((v) => v !== null);
  await upsertVideos(videos);

  const start = channel.channel_created_at ? pacificDayOf(channel.channel_created_at) : "2005-04-23";
  for (const [from, to] of dateChunks(start, todayPacific())) {
    await upsertChannelDaily(channel.id, await fetchDaily(ctx, from, to));
  }
  await updateChannel(channel.id, { channel_history_done: true });
  await logSync(channel.id, "import", true, `Imported ${videos.length} videos and channel history`);
}

/** Step B: per-video daily history, newest videos first, until the deadline. */
async function importVideoHistories(ctx: ChannelCtx, deadline: number): Promise<boolean> {
  const today = todayPacific();
  while (Date.now() < deadline) {
    const batch = await videosNeedingHistory(ctx.channel.id, VIDEO_CONCURRENCY * 3);
    if (batch.length === 0) return true;
    for (let i = 0; i < batch.length && Date.now() < deadline; i += VIDEO_CONCURRENCY) {
      const group = batch.slice(i, i + VIDEO_CONCURRENCY);
      await Promise.all(
        group.map(async (v) => {
          const start = pacificDayOf(v.published_at);
          if (start <= today) {
            await upsertVideoDaily(ctx.channel.id, v.id, await fetchDaily(ctx, start, today, `video==${v.id}`));
          }
        }),
      );
      await markVideoHistoryDone(group.map((v) => v.id));
    }
  }
  return false;
}

export type ImportProgress = {
  done: boolean;
  channels: Array<{ id: string; title: string; videosTotal: number; videosPending: number; basicsDone: boolean; error?: string }>;
};

/** Does as much import work as fits before `deadline` (ms timestamp). */
export async function runImportStep(deadline: number): Promise<ImportProgress> {
  const channels = (await listChannelsWithTokens()).filter((c) => c.connection_status === "ok");
  const errors: Record<string, string> = {};

  for (const channel of channels) {
    if (Date.now() >= deadline) break;
    const counts = (await videoCounts([channel.id]))[channel.id];
    if (channel.channel_history_done && counts.pending === 0) continue;
    try {
      const ctx = await openChannel(channel);
      if (!ctx) continue;
      if (!channel.channel_history_done) await importChannelBasics(ctx);
      const finished = await importVideoHistories(ctx, deadline);
      await updateChannel(channel.id, { last_sync_at: new Date().toISOString(), last_sync_ok: true, last_sync_message: null });
      if (finished) await logSync(channel.id, "import", true, "All video history imported");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      errors[channel.id] = message;
      await updateChannel(channel.id, { last_sync_ok: false, last_sync_message: `Import problem: ${message}` });
      await logSync(channel.id, "import", false, message);
    }
  }

  const fresh = (await listChannelsWithTokens()).filter((c) => c.connection_status === "ok");
  const counts = await videoCounts(fresh.map((c) => c.id));
  const progress = fresh.map((c) => ({
    id: c.id,
    title: c.title,
    videosTotal: counts[c.id]?.total ?? 0,
    videosPending: counts[c.id]?.pending ?? 0,
    basicsDone: c.channel_history_done,
    error: errors[c.id],
  }));
  // Stop looping if every unfinished channel just hit an error, so the page doesn't spin forever.
  const unfinished = progress.filter((p) => !p.basicsDone || p.videosPending > 0);
  return { done: unfinished.every((p) => p.error), channels: progress };
}

/** Called after Google sign-in for a channel. Returns the channel ID. */
export async function saveConnectedChannel(opts: { accessToken: string; refreshToken: string; scopes: string }) {
  const info = await getMyChannel(opts.accessToken);
  if (!info) return null;
  await upsertChannel({
    id: info.id,
    title: info.title,
    thumbnail_url: info.thumbnailUrl,
    uploads_playlist_id: info.uploadsPlaylistId,
    channel_created_at: info.createdAt,
    refresh_token_enc: encryptToken(opts.refreshToken, env.appSecret),
    granted_scopes: opts.scopes,
    connection_status: "ok",
    // Re-check revenue access on every (re)connect.
    revenue_status: "unknown",
    last_sync_ok: true,
    last_sync_message: "Connected",
  });
  return info;
}
