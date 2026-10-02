import { NextResponse, type NextRequest } from "next/server";
import { parseAllowedEmails, readSessionValue, SESSION_COOKIE } from "@/lib/session";

// Every page and API route needs a login, except these.
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/oauth/callback"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const secret = process.env.APP_SECRET ?? "";
  const session =
    secret.length >= 32
      ? readSessionValue(req.cookies.get(SESSION_COOKIE)?.value, secret, parseAllowedEmails(process.env.ALLOWED_EMAILS))
      : null;
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
