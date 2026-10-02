import { describe, expect, it } from "vitest";
import { createSessionValue, parseAllowedEmails, readSessionValue } from "./session";

const SECRET = "s".repeat(40);
const allowed = parseAllowedEmails(" Me@Example.com , other@example.com,");

describe("session", () => {
  it("parses the allowed list case-insensitively", () => {
    expect(allowed).toEqual(["me@example.com", "other@example.com"]);
  });
  it("accepts a valid session", () => {
    expect(readSessionValue(createSessionValue("me@example.com", SECRET), SECRET, allowed)?.email).toBe("me@example.com");
  });
  it("rejects expired sessions", () => {
    const old = createSessionValue("me@example.com", SECRET, Date.now() - 31 * 86400_000);
    expect(readSessionValue(old, SECRET, allowed)).toBeNull();
  });
  it("rejects emails removed from the allowed list", () => {
    const v = createSessionValue("gone@example.com", SECRET);
    expect(readSessionValue(v, SECRET, allowed)).toBeNull();
  });
});
