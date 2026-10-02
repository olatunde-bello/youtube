// Read-only Google scopes. Nothing here lets the app upload, edit or delete.

export const LOGIN_SCOPES = ["openid", "email"];

export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
  // Revenue. Includes everything yt-analytics.readonly gives, plus money.
  "https://www.googleapis.com/auth/yt-analytics-monetary.readonly",
];

export const REQUIRED_YOUTUBE_SCOPES = YOUTUBE_SCOPES.slice(0, 2);
export const REVENUE_SCOPE = YOUTUBE_SCOPES[2];

export function parseScopes(raw: string | undefined): string[] {
  return (raw ?? "").split(/\s+/).filter(Boolean);
}

/** Google lets people untick scopes on the consent screen, so check what we got. */
export function missingRequiredScopes(granted: string[]): string[] {
  const has = new Set(granted);
  // The monetary scope is a superset of yt-analytics.readonly.
  if (has.has(REVENUE_SCOPE)) has.add(REQUIRED_YOUTUBE_SCOPES[1]);
  return REQUIRED_YOUTUBE_SCOPES.filter((s) => !has.has(s));
}
