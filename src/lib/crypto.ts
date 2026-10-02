// Encryption for stored YouTube tokens and signing for the login cookie.
// Both keys are derived from the single APP_SECRET, so there is only one
// secret to set up.
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

function deriveKey(secret: string, purpose: string): Buffer {
  if (!secret || secret.length < 32) throw new Error("APP_SECRET must be at least 32 characters");
  return Buffer.from(hkdfSync("sha256", secret, "youtube-dashboard", purpose, 32));
}

/** AES-256-GCM. Output: v1.<iv>.<tag>.<ciphertext>, all base64url. */
export function encryptToken(plain: string, secret: string): string {
  const key = deriveKey(secret, "token-encryption");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptToken(encoded: string, secret: string): string {
  const [version, iv, tag, data] = encoded.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unrecognised encrypted token format");
  const key = deriveKey(secret, "token-encryption");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

function hmac(payload: string, secret: string): string {
  return createHmac("sha256", deriveKey(secret, "session-signing")).update(payload).digest("base64url");
}

/** Signs a JSON-serialisable value: <payload>.<signature>. */
export function sign(value: unknown, secret: string): string {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${hmac(payload, secret)}`;
}

/** Returns the signed value, or null if the signature is wrong or missing. */
export function verify<T>(signed: string | undefined, secret: string): T | null {
  if (!signed) return null;
  const [payload, sig] = signed.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(hmac(payload, secret));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function randomState(): string {
  return randomBytes(24).toString("base64url");
}
