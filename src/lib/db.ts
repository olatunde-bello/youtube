import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";
import type { DailyMetrics } from "./analytics-parse";
import type { VideoRow } from "./videos";

export type { VideoRow };

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  client ??= createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export type ChannelRow = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  uploads_playlist_id: string;
  channel_created_at: string | null;
  refresh_token_enc: string;
  granted_scopes: string;
  connection_status: "ok" | "needs_reconnect";
  revenue_status: "unknown" | "available" | "unavailable";
  channel_history_done: boolean;
  last_sync_at: string | null;
  last_sync_ok: boolean | null;
  last_sync_message: string | null;
  connected_at: string;
};

/** Channel fields that are safe to send to the browser (no token). */
export type PublicChannel = Omit<ChannelRow, "refresh_token_enc">;
const PUBLIC_CHANNEL_COLUMNS =
  "id,title,thumbnail_url,uploads_playlist_id,channel_created_at,granted_scopes,connection_status,revenue_status,channel_history_done,last_sync_at,last_sync_ok,last_sync_message,connected_at";

function check<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Database error (${what}): ${result.error.message}`);
  return result.data;
}

async function inChunks<T>(rows: T[], size: number, fn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

export async function listPublicChannels(): Promise<PublicChannel[]> {
  return check(await db().from("channels").select(PUBLIC_CHANNEL_COLUMNS).order("connected_at"), "list channels") as PublicChannel[];
}

/** Server-only: includes the encrypted token. */
export async function listChannelsWithTokens(): Promise<ChannelRow[]> {
  return check(await db().from("channels").select("*").order("connected_at"), "list channels") as ChannelRow[];
}

export async function upsertChannel(row: Partial<ChannelRow> & { id: string }) {
  check(await db().from("channels").upsert({ ...row, updated_at: new Date().toISOString() }), "save channel");
}

export async function updateChannel(id: string, patch: Partial<ChannelRow>) {
  check(await db().from("channels").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id), "update channel");
}

export async function upsertVideos(rows: VideoRow[]) {
  const now = new Date().toISOString();
  // history_done is left out on purpose so re-imports don't reset it.
  await inChunks(rows, 500, async (chunk) => {
    check(await db().from("videos").upsert(chunk.map((r) => ({ ...r, updated_at: now }))), "save videos");
  });
}

export async function videosNeedingHistory(channelId: string, limit: number) {
  return check(
    await db()
      .from("videos")
      .select("id,published_at")
      .eq("channel_id", channelId)
      .eq("history_done", false)
      .order("published_at", { ascending: false })
      .limit(limit),
    "videos needing history",
  ) as Array<{ id: string; published_at: string }>;
}

export async function markVideoHistoryDone(ids: string[]) {
  if (ids.length === 0) return;
  check(await db().from("videos").update({ history_done: true }).in("id", ids), "mark history done");
}

export async function upsertChannelDaily(channelId: string, rows: DailyMetrics[]) {
  const now = new Date().toISOString();
  await inChunks(rows, 500, async (chunk) => {
    check(
      await db().from("channel_daily").upsert(chunk.map((r) => ({ ...r, channel_id: channelId, fetched_at: now }))),
      "save channel daily",
    );
  });
}

export async function upsertVideoDaily(channelId: string, videoId: string, rows: DailyMetrics[]) {
  const now = new Date().toISOString();
  await inChunks(rows, 500, async (chunk) => {
    check(
      await db()
        .from("video_daily")
        .upsert(chunk.map((r) => ({ ...r, channel_id: channelId, video_id: videoId, fetched_at: now }))),
      "save video daily",
    );
  });
}

async function countVideos(channelId: string, pendingOnly: boolean): Promise<number> {
  let q = db().from("videos").select("id", { count: "exact", head: true }).eq("channel_id", channelId);
  if (pendingOnly) q = q.eq("history_done", false);
  const { count, error } = await q;
  if (error) throw new Error(`Database error (count videos): ${error.message}`);
  return count ?? 0;
}

export async function videoCounts(channelIds: string[]): Promise<Record<string, { total: number; pending: number }>> {
  const out: Record<string, { total: number; pending: number }> = {};
  await Promise.all(
    channelIds.map(async (id) => {
      const [total, pending] = await Promise.all([countVideos(id, false), countVideos(id, true)]);
      out[id] = { total, pending };
    }),
  );
  return out;
}

export async function logSync(channelId: string | null, kind: "import" | "sync", ok: boolean, message: string) {
  check(await db().from("sync_log").insert({ channel_id: channelId, kind, ok, message }), "write sync log");
}

export type SyncLogRow = { id: number; channel_id: string | null; kind: string; ok: boolean; message: string | null; created_at: string };

export async function recentSyncLog(limit = 10): Promise<SyncLogRow[]> {
  return check(await db().from("sync_log").select("*").order("created_at", { ascending: false }).limit(limit), "read sync log") as SyncLogRow[];
}
