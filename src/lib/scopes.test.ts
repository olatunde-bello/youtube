import { describe, expect, it } from "vitest";
import { missingRequiredScopes, YOUTUBE_SCOPES } from "./scopes";

describe("scopes", () => {
  it("only asks for read-only scopes", () => {
    for (const s of YOUTUBE_SCOPES) expect(s).toMatch(/readonly$/);
  });
  it("accepts all granted", () => {
    expect(missingRequiredScopes(YOUTUBE_SCOPES)).toEqual([]);
  });
  it("treats the revenue scope as covering analytics", () => {
    expect(missingRequiredScopes([YOUTUBE_SCOPES[0], YOUTUBE_SCOPES[2]])).toEqual([]);
  });
  it("flags missing YouTube access", () => {
    expect(missingRequiredScopes([YOUTUBE_SCOPES[1]])).toEqual([YOUTUBE_SCOPES[0]]);
  });
});
