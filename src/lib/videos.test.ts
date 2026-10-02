import { describe, expect, it } from "vitest";
import { isLikelyShort, parseIsoDuration } from "./duration";
import { toVideoRow } from "./videos";

describe("durations", () => {
  it("parses ISO 8601", () => {
    expect(parseIsoDuration("PT1H2M3S")).toBe(3723);
    expect(parseIsoDuration("PT45S")).toBe(45);
    expect(parseIsoDuration("P1DT1M")).toBe(86460);
    expect(parseIsoDuration("P0D")).toBe(0);
    expect(parseIsoDuration("nonsense")).toBeNull();
    expect(parseIsoDuration(undefined)).toBeNull();
  });
  it("treats up to 3 minutes as a Short", () => {
    expect(isLikelyShort(59)).toBe(true);
    expect(isLikelyShort(180)).toBe(true);
    expect(isLikelyShort(181)).toBe(false);
    expect(isLikelyShort(0)).toBe(false);
    expect(isLikelyShort(null)).toBe(false);
  });
});

describe("toVideoRow", () => {
  const base = {
    id: "abc",
    snippet: { title: "T", publishedAt: "2026-01-01T00:00:00Z", thumbnails: { default: { url: "d" }, medium: { url: "m" } } },
    contentDetails: { duration: "PT10M" },
    status: { privacyStatus: "public" },
  };
  it("maps fields", () => {
    expect(toVideoRow("UC1", base)).toEqual({
      id: "abc",
      channel_id: "UC1",
      title: "T",
      published_at: "2026-01-01T00:00:00Z",
      duration_seconds: 600,
      is_short: false,
      privacy_status: "public",
      thumbnail_url: "m",
    });
  });
  it("skips upcoming premieres", () => {
    expect(toVideoRow("UC1", { ...base, snippet: { ...base.snippet, liveBroadcastContent: "upcoming" } })).toBeNull();
  });
});
