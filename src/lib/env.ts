import "server-only";
import { parseAllowedEmails } from "./session";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return value;
}

export const env = {
  get appUrl() {
    return required("APP_URL").replace(/\/+$/, "");
  },
  get appSecret() {
    return required("APP_SECRET");
  },
  get allowedEmails() {
    return parseAllowedEmails(required("ALLOWED_EMAILS"));
  },
  get googleClientId() {
    return required("GOOGLE_CLIENT_ID");
  },
  get googleClientSecret() {
    return required("GOOGLE_CLIENT_SECRET");
  },
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY");
  },
};

/** The single redirect URI registered in Google Cloud. */
export function oauthRedirectUri(): string {
  return `${env.appUrl}/api/oauth/callback`;
}
