import "server-only";
// Minimal Google OAuth + YouTube API client using fetch (no heavy SDK).
// Tokens are never logged: errors only carry Google's status and reason.
import { env, oauthRedirectUri } from "./env";
import type { VideoResource } from "./videos";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DATA_API = "https://www.googleapis.com/youtube/v3";
const ANALYTICS_API = "https://youtubeanalytics.googleapis.com/v2/reports";

export class GoogleApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public reason: string | null,
  ) {
    super(message);
  }
  /** The stored sign-in no longer works; the person must reconnect. */
  get needsReconnect() {
    return this.reason === "invalid_grant" || this.status === 401;
  }
}

export function buildAuthUrl(opts: { scopes: string[]; state: string; offline: boolean }): string {
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: oauthRedirectUri(),
    response_type: "code",
    scope: opts.scopes.join(" "),
    state: opts.state,
  });
  if (opts.offline) {
    params.set("access_type", "offline");
    // Always show the account/Brand Account chooser and always return a refresh token.
    params.set("prompt", "consent select_account");
  } else {
    params.set("prompt", "select_account");
  }
  return `${AUTH_URL}?${params}`;
}

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
  expires_in: number;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      ...body,
    }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Partial<TokenResponse> & { error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new GoogleApiError(`Google sign-in failed: ${json.error ?? res.status}`, res.status, json.error ?? null);
  }
  return json as TokenResponse;
}

export function exchangeCode(code: string) {
  return tokenRequest({ code, grant_type: "authorization_code", redirect_uri: oauthRedirectUri() });
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  return (await tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" })).access_token;
}

/**
 * Reads the email from an ID token. Signature checking is skipped because the
 * token came straight from Google's token endpoint over HTTPS (Google's docs
 * say this is acceptable in that case).
 */
export function emailFromIdToken(idToken: string | undefined): { email: string; verified: boolean } | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
    if (typeof payload.email !== "string") return null;
    return { email: payload.email, verified: payload.email_verified === true || payload.email_verified === "true" };
  } catch {
    return null;
  }
}

async function getJson<T>(url: string, accessToken: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (res.ok) return (await res.json()) as T;
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; errors?: Array<{ reason?: string }> };
    };
    const reason = body.error?.errors?.[0]?.reason ?? null;
    // Back off and retry on rate limits and Google-side hiccups.
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    throw new GoogleApiError(body.error?.message ?? `Google API error ${res.status}`, res.status, reason);
  }
}

// ---------- YouTube Data API (costs 1 quota unit per call) ----------

type ChannelResource = {
  id: string;
  snippet: { title: string; publishedAt: string; thumbnails?: Record<string, { url: string }> };
  contentDetails: { relatedPlaylists: { uploads: string } };
};

export async function getMyChannel(accessToken: string) {
  const res = await getJson<{ items?: ChannelResource[] }>(
    `${DATA_API}/channels?part=snippet,contentDetails&mine=true`,
    accessToken,
  );
  const ch = res.items?.[0];
  if (!ch) return null;
  const thumbs = ch.snippet.thumbnails ?? {};
  return {
    id: ch.id,
    title: ch.snippet.title,
    thumbnailUrl: (thumbs.medium ?? thumbs.default)?.url ?? null,
    createdAt: ch.snippet.publishedAt,
    uploadsPlaylistId: ch.contentDetails.relatedPlaylists.uploads,
  };
}

/** All video IDs in a channel's uploads playlist (50 per call). */
export async function listUploadIds(accessToken: string, playlistId: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ part: "contentDetails", playlistId, maxResults: "50" });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await getJson<{ items?: Array<{ contentDetails: { videoId: string } }>; nextPageToken?: string }>(
      `${DATA_API}/playlistItems?${params}`,
      accessToken,
    );
    for (const item of res.items ?? []) ids.push(item.contentDetails.videoId);
    pageToken = res.nextPageToken;
  } while (pageToken);
  return ids;
}

/** Video details, batched 50 IDs per call. */
export async function getVideos(accessToken: string, ids: string[]): Promise<VideoResource[]> {
  const out: VideoResource[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const params = new URLSearchParams({ part: "snippet,contentDetails,status", id: ids.slice(i, i + 50).join(","), maxResults: "50" });
    const res = await getJson<{ items?: VideoResource[] }>(`${DATA_API}/videos?${params}`, accessToken);
    out.push(...(res.items ?? []));
  }
  return out;
}

// ---------- YouTube Analytics API ----------

export function analyticsReport(
  accessToken: string,
  params: { startDate: string; endDate: string; metrics: string[]; dimensions?: string; filters?: string; sort?: string },
) {
  const q = new URLSearchParams({
    ids: "channel==MINE",
    startDate: params.startDate,
    endDate: params.endDate,
    metrics: params.metrics.join(","),
  });
  if (params.dimensions) q.set("dimensions", params.dimensions);
  if (params.filters) q.set("filters", params.filters);
  if (params.sort) q.set("sort", params.sort);
  return getJson<import("./analytics-parse").AnalyticsResponse>(`${ANALYTICS_API}?${q}`, accessToken);
}
