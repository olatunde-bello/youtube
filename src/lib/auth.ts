import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "./env";
import { readSessionValue, SESSION_COOKIE, type Session } from "./session";

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return readSessionValue(store.get(SESSION_COOKIE)?.value, env.appSecret, env.allowedEmails);
}

/** For pages: send logged-out visitors to /login. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
