import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { cookieOptions } from "@/lib/cookies";
import { logSync } from "@/lib/db";
import { env } from "@/lib/env";
import { emailFromIdToken, exchangeCode } from "@/lib/google";
import { saveConnectedChannel } from "@/lib/importer";
import { checkState, STATE_COOKIE } from "@/lib/oauth-state";
import { missingRequiredScopes, parseScopes } from "@/lib/scopes";
import { createSessionValue, isAllowedEmail, SESSION_COOKIE, SESSION_DAYS } from "@/lib/session";

// The single redirect URI registered in Google Cloud. Handles both logging in
// and connecting a channel; the signed state cookie says which.
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const purpose = checkState(req.cookies.get(STATE_COOKIE)?.value, url.searchParams.get("state"), env.appSecret);
  const back = (path: string) => {
    const res = NextResponse.redirect(`${env.appUrl}${path}`);
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/oauth" });
    return res;
  };

  if (!purpose) return back("/login?error=expired");
  const fail = purpose === "login" ? "/login?error=" : "/settings?error=";
  const code = url.searchParams.get("code");
  if (url.searchParams.get("error") || !code) return back(`${fail}cancelled`);

  try {
    const tokens = await exchangeCode(code);

    if (purpose === "login") {
      const who = emailFromIdToken(tokens.id_token);
      if (!who || !who.verified || !isAllowedEmail(who.email, env.allowedEmails)) return back("/login?error=not_allowed");
      const res = back("/");
      res.cookies.set(SESSION_COOKIE, createSessionValue(who.email.toLowerCase(), env.appSecret), cookieOptions(SESSION_DAYS * 86400));
      return res;
    }

    // purpose === "connect"
    if (!(await getSession())) return back("/login");
    const granted = parseScopes(tokens.scope);
    if (missingRequiredScopes(granted).length > 0) return back("/settings?error=scopes");
    if (!tokens.refresh_token) return back("/settings?error=no_refresh");
    const channel = await saveConnectedChannel({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      scopes: granted.join(" "),
    });
    if (!channel) return back("/settings?error=no_channel");
    await logSync(channel.id, "import", true, "Channel connected");
    return back("/settings?connected=1");
  } catch (e) {
    console.error("OAuth callback failed:", e instanceof Error ? e.message : "unknown error");
    return back(`${fail}google`);
  }
}
