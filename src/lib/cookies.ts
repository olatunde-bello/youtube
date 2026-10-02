import "server-only";
import { env } from "./env";

export function cookieOptions(maxAgeSeconds: number, path = "/") {
  return {
    httpOnly: true,
    secure: env.appUrl.startsWith("https://"),
    sameSite: "lax" as const,
    path,
    maxAge: maxAgeSeconds,
  };
}
