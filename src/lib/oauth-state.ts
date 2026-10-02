// Short-lived signed cookie that ties a Google redirect back to the request
// that started it (protects against forged sign-in callbacks).
import { randomState, sign, verify } from "./crypto";

export const STATE_COOKIE = "yd_oauth_state";
export const STATE_MAX_AGE_SECONDS = 600;

export type OAuthPurpose = "login" | "connect";
type StatePayload = { state: string; purpose: OAuthPurpose; exp: number };

export function createState(purpose: OAuthPurpose, secret: string, now = Date.now()) {
  const state = randomState();
  const cookie = sign({ state, purpose, exp: now + STATE_MAX_AGE_SECONDS * 1000 } satisfies StatePayload, secret);
  return { state, cookie };
}

/** Returns the purpose if the callback's state matches the cookie, else null. */
export function checkState(cookie: string | undefined, returnedState: string | null, secret: string, now = Date.now()): OAuthPurpose | null {
  const payload = verify<StatePayload>(cookie, secret);
  if (!payload || !returnedState || payload.state !== returnedState || payload.exp < now) return null;
  return payload.purpose;
}
