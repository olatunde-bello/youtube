import { describe, expect, it } from "vitest";
import { parseDailyReport } from "./analytics-parse";

describe("parseDailyReport", () => {
  it("maps columns by name and keeps unrequested metrics null", () => {
    const rows = parseDailyReport({
      columnHeaders: [{ name: "day" }, { name: "views" }, { name: "estimatedMinutesWatched" }, { name: "subscribersGained" }],
      rows: [["2026-09-01", 120, 340.5, 3]],
    });
    expect(rows).toEqual([
      { day: "2026-09-01", views: 120, watch_minutes: 340.5, avg_view_pct: null, subs_gained: 3, subs_lost: null, revenue: null },
    ]);
  });
  it("keeps a real zero as zero", () => {
    const [row] = parseDailyReport({ columnHeaders: [{ name: "day" }, { name: "estimatedRevenue" }], rows: [["2026-09-01", 0]] });
    expect(row.revenue).toBe(0);
  });
  it("handles empty responses", () => {
    expect(parseDailyReport({})).toEqual([]);
    expect(parseDailyReport({ columnHeaders: [{ name: "views" }], rows: [[1]] })).toEqual([]);
  });
});
