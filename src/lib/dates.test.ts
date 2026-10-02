import { describe, expect, it } from "vitest";
import { addDays, dateChunks, pacificDayOf, todayPacific } from "./dates";

describe("dates", () => {
  it("uses Pacific time for 'today'", () => {
    // 05:00 UTC on Mar 2 is still Mar 1 in California.
    expect(todayPacific(new Date("2026-03-02T05:00:00Z"))).toBe("2026-03-01");
    expect(pacificDayOf("2026-03-02T09:00:00Z")).toBe("2026-03-02");
  });
  it("adds days across month and year ends", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
  });
  it("splits ranges into chunks without gaps", () => {
    expect(dateChunks("2024-01-01", "2024-01-10", 4)).toEqual([
      ["2024-01-01", "2024-01-04"],
      ["2024-01-05", "2024-01-08"],
      ["2024-01-09", "2024-01-10"],
    ]);
    expect(dateChunks("2024-01-01", "2024-01-01")).toEqual([["2024-01-01", "2024-01-01"]]);
    expect(dateChunks("2024-01-02", "2024-01-01")).toEqual([]);
  });
});
