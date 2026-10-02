import { describe, expect, it } from "vitest";
import { checkState, createState } from "./oauth-state";

const SECRET = "o".repeat(40);

describe("oauth state", () => {
  it("matches its own state and returns the purpose", () => {
    const { state, cookie } = createState("connect", SECRET);
    expect(checkState(cookie, state, SECRET)).toBe("connect");
  });
  it("rejects mismatched, missing or stale state", () => {
    const { state, cookie } = createState("login", SECRET);
    expect(checkState(cookie, "other", SECRET)).toBeNull();
    expect(checkState(cookie, null, SECRET)).toBeNull();
    expect(checkState(undefined, state, SECRET)).toBeNull();
    expect(checkState(cookie, state, SECRET, Date.now() + 11 * 60_000)).toBeNull();
  });
});
