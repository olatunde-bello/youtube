import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cookieOptions } from "@/lib/cookies";
import { env } from "@/lib/env";
import { buildAuthUrl } from "@/lib/google";
import { createState, STATE_COOKIE, STATE_MAX_AGE_SECONDS } from "@/lib/oauth-state";
import { YOUTUBE_SCOPES } from "@/lib/scopes";

// Starts "Connect a channel" (also used for Reconnect).
export async function GET() {
  if (!(await getSession())) return NextResponse.redirect(`${env.appUrl}/login`);
  const { state, cookie } = createState("connect", env.appSecret);
  const res = NextResponse.redirect(buildAuthUrl({ scopes: YOUTUBE_SCOPES, state, offline: true }));
  res.cookies.set(STATE_COOKIE, cookie, cookieOptions(STATE_MAX_AGE_SECONDS, "/api/oauth"));
  return res;
}
