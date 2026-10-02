import { NextResponse } from "next/server";
import { cookieOptions } from "@/lib/cookies";
import { env } from "@/lib/env";
import { buildAuthUrl } from "@/lib/google";
import { createState, STATE_COOKIE, STATE_MAX_AGE_SECONDS } from "@/lib/oauth-state";
import { LOGIN_SCOPES } from "@/lib/scopes";

export async function GET() {
  const { state, cookie } = createState("login", env.appSecret);
  const res = NextResponse.redirect(buildAuthUrl({ scopes: LOGIN_SCOPES, state, offline: false }));
  res.cookies.set(STATE_COOKIE, cookie, cookieOptions(STATE_MAX_AGE_SECONDS, "/api/oauth"));
  return res;
}
