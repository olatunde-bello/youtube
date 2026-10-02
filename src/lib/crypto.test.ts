import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken, sign, verify } from "./crypto";

const SECRET = "x".repeat(40);

describe("token encryption", () => {
  it("round-trips", () => {
    const enc = encryptToken("1//refresh-token", SECRET);
    expect(enc).not.toContain("refresh-token");
    expect(decryptToken(enc, SECRET)).toBe("1//refresh-token");
  });
  it("uses a fresh IV each time", () => {
    expect(encryptToken("a", SECRET)).not.toBe(encryptToken("a", SECRET));
  });
  it("rejects a wrong secret or tampering", () => {
    const enc = encryptToken("abc", SECRET);
    expect(() => decryptToken(enc, "y".repeat(40))).toThrow();
    const parts = enc.split(".");
    parts[3] = Buffer.from("zzz").toString("base64url");
    expect(() => decryptToken(parts.join("."), SECRET)).toThrow();
  });
  it("refuses short secrets", () => {
    expect(() => encryptToken("a", "short")).toThrow(/32/);
  });
});

describe("signing", () => {
  it("verifies its own signatures and rejects edits", () => {
    const s = sign({ a: 1 }, SECRET);
    expect(verify(s, SECRET)).toEqual({ a: 1 });
    const forged = Buffer.from(JSON.stringify({ a: 2 })).toString("base64url") + "." + s.split(".")[1];
    expect(verify(forged, SECRET)).toBeNull();
    expect(verify(s, "z".repeat(40))).toBeNull();
    expect(verify(undefined, SECRET)).toBeNull();
    expect(verify("garbage", SECRET)).toBeNull();
  });
});
