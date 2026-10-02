import { beforeEach, describe, expect, it, vi } from "vitest";
import { encryptToken } from "./crypto";
import type { ChannelRow } from "./db";

const SECRET = "i".repeat(40);
vi.mock("./env", () => ({ env: { appSecret: "i".repeat(40) } }));

// In-memory stand-ins for the database and Google.
const state = vi.hoisted(() => ({
  channels: [] as ChannelRow[],
  videos: new Map<string, { id: string; channel_id: string; published_at: string; history_done: boolean }>(),
  channelDaily: [] as unknown[],
  videoDaily: new Map<string, unknown[]>(),
  analyticsCalls: [] as Array<{ metrics: string[]; filters?: string }>,
  revenueForbidden: false,
  refreshFails: false,
}));

vi.mock("./db", () => ({
  listChannelsWithTokens: async () => state.channels.map((c) => ({ ...c })),
  updateChannel: async (id: string, patch: Partial<ChannelRow>) => {
    const c = state.channels.find((x) => x.id === id)!;
    Object.assign(c, patch);
  },
  upsertChannel: async () => {},
  upsertVideos: async (rows: Array<{ id: string; channel_id: string; published_at: string }>) => {
    for (const r of rows) state.videos.set(r.id, { ...r, history_done: state.videos.get(r.id)?.history_done ?? false });
  },
  videosNeedingHistory: async (channelId: string, limit: number) =>
    [...state.videos.values()].filter((v) => v.channel_id === channelId && !v.history_done).slice(0, limit),
  markVideoHistoryDone: async (ids: string[]) => ids.forEach((id) => (state.videos.get(id)!.history_done = true)),
  upsertChannelDaily: async (_id: string, rows: unknown[]) => state.channelDaily.push(...rows),
  upsertVideoDaily: async (_c: string, videoId: string, rows: unknown[]) => state.videoDaily.set(videoId, rows),
  videoCounts: async (ids: string[]) =>
    Object.fromEntries(
      ids.map((id) => {
        const vs = [...state.videos.values()].filter((v) => v.channel_id === id);
        return [id, { total: vs.length, pending: vs.filter((v) => !v.history_done).length }];
      }),
    ),
  logSync: async () => {},
}));

vi.mock("./google", async () => {
  class GoogleApiError extends Error {
    constructor(message: string, public status: number, public reason: string | null) {
      super(message);
    }
    get needsReconnect() {
      return this.reason === "invalid_grant";
    }
  }
  return {
    GoogleApiError,
    refreshAccessToken: async () => {
      if (state.refreshFails) throw new GoogleApiError("expired", 400, "invalid_grant");
      return "access";
    },
    getMyChannel: async () => null,
    listUploadIds: async () => ["v1", "v2", "v3"],
    getVideos: async (_t: string, ids: string[]) =>
      ids.map((id) => ({
        id,
        snippet: { title: id, publishedAt: "2026-09-20T12:00:00Z" },
        contentDetails: { duration: "PT5M" },
      })),
    analyticsReport: async (_t: string, p: { metrics: string[]; filters?: string }) => {
      state.analyticsCalls.push(p);
      if (state.revenueForbidden && p.metrics.includes("estimatedRevenue")) throw new GoogleApiError("Forbidden", 403, "forbidden");
      return {
        columnHeaders: [{ name: "day" }, ...p.metrics.map((name) => ({ name }))],
        rows: [["2026-09-21", ...p.metrics.map(() => 5)]],
      };
    },
  };
});

const { runImportStep } = await import("./importer");

function channel(overrides: Partial<ChannelRow> = {}): ChannelRow {
  return {
    id: "UC1",
    title: "Channel One",
    thumbnail_url: null,
    uploads_playlist_id: "UU1",
    channel_created_at: "2026-09-01T00:00:00Z",
    refresh_token_enc: encryptToken("refresh", SECRET),
    granted_scopes: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
      "https://www.googleapis.com/auth/yt-analytics-monetary.readonly",
    ].join(" "),
    connection_status: "ok",
    revenue_status: "unknown",
    channel_history_done: false,
    last_sync_at: null,
    last_sync_ok: null,
    last_sync_message: null,
    connected_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  state.channels = [];
  state.videos.clear();
  state.channelDaily = [];
  state.videoDaily.clear();
  state.analyticsCalls = [];
  state.revenueForbidden = false;
  state.refreshFails = false;
});

describe("runImportStep", () => {
  it("imports videos, channel history and every video's history", async () => {
    state.channels = [channel()];
    const progress = await runImportStep(Date.now() + 10_000);
    expect(progress.done).toBe(true);
    expect(progress.channels[0]).toMatchObject({ videosTotal: 3, videosPending: 0, basicsDone: true });
    expect(state.videoDaily.size).toBe(3);
    expect(state.channels[0].revenue_status).toBe("available");
    expect(state.analyticsCalls.filter((c) => c.filters?.startsWith("video=="))).toHaveLength(3);
  });

  it("falls back to no revenue (null, not 0) when YouTube refuses it", async () => {
    state.channels = [channel()];
    state.revenueForbidden = true;
    await runImportStep(Date.now() + 10_000);
    expect(state.channels[0].revenue_status).toBe("unavailable");
    expect(state.channelDaily[0]).toMatchObject({ views: 5, revenue: null });
    // After learning that, it stops asking for revenue.
    const revenueAsks = state.analyticsCalls.filter((c) => c.metrics.includes("estimatedRevenue"));
    expect(revenueAsks).toHaveLength(1);
  });

  it("never asks for revenue if the revenue permission wasn't granted", async () => {
    state.channels = [channel({ granted_scopes: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly" })];
    await runImportStep(Date.now() + 10_000);
    expect(state.analyticsCalls.some((c) => c.metrics.includes("estimatedRevenue"))).toBe(false);
  });

  it("marks the channel for reconnect when the Google sign-in has expired", async () => {
    state.channels = [channel()];
    state.refreshFails = true;
    const progress = await runImportStep(Date.now() + 10_000);
    expect(state.channels[0].connection_status).toBe("needs_reconnect");
    expect(progress.done).toBe(true);
  });

  it("stops at the deadline and resumes next call", async () => {
    state.channels = [channel()];
    const first = await runImportStep(Date.now() - 1);
    expect(first.done).toBe(false);
    const second = await runImportStep(Date.now() + 10_000);
    expect(second.done).toBe(true);
  });
});
