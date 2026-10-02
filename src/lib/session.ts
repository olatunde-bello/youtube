// The login cookie. Pure helpers so both the proxy and server code can use them.
import { sign, verify } from "./crypto";

export const SESSION_COOKIE = "yd_session";
export const SESSION_DAYS = 30;

export type Session = { email: string; exp: number };

export function createSessionValue(email: string, secret: string, now = Date.now()): string {
  const session: Session = { email, exp: now + SESSION_DAYS * 24 * 60 * 60 * 1000 };
  return sign(session, secret);
}

export function readSessionValue(value: string | undefined, secret: string, allowed: string[], now = Date.now()): Session | null {
  const session = verify<Session>(value, secret);
  if (!session || typeof session.email !== "string" || typeof session.exp !== "number") return null;
  if (session.exp < now) return null;
  if (!isAllowedEmail(session.email, allowed)) return null;
  return session;
}

export function parseAllowedEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string, allowed: string[]): boolean {
  return allowed.includes(email.trim().toLowerCase());
}
