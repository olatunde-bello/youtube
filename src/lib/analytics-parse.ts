// Turns YouTube Analytics API responses into database rows.

export type AnalyticsResponse = {
  columnHeaders?: Array<{ name: string }>;
  rows?: Array<Array<string | number | null>>;
};

export type DailyMetrics = {
  day: string;
  views: number | null;
  watch_minutes: number | null;
  avg_view_pct: number | null;
  subs_gained: number | null;
  subs_lost: number | null;
  revenue: number | null;
};

export const BASE_METRICS = [
  "views",
  "estimatedMinutesWatched",
  "averageViewPercentage",
  "subscribersGained",
  "subscribersLost",
];
export const REVENUE_METRIC = "estimatedRevenue";

const COLUMN_TO_FIELD: Record<string, keyof Omit<DailyMetrics, "day">> = {
  views: "views",
  estimatedMinutesWatched: "watch_minutes",
  averageViewPercentage: "avg_view_pct",
  subscribersGained: "subs_gained",
  subscribersLost: "subs_lost",
  estimatedRevenue: "revenue",
};

function toNumber(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Parses a report with dimensions=day. Metrics not requested stay null (unknown, not zero). */
export function parseDailyReport(res: AnalyticsResponse): DailyMetrics[] {
  const headers = (res.columnHeaders ?? []).map((h) => h.name);
  const dayIdx = headers.indexOf("day");
  if (dayIdx === -1) return [];
  return (res.rows ?? []).map((row) => {
    const out: DailyMetrics = {
      day: String(row[dayIdx]),
      views: null,
      watch_minutes: null,
      avg_view_pct: null,
      subs_gained: null,
      subs_lost: null,
      revenue: null,
    };
    headers.forEach((name, i) => {
      const field = COLUMN_TO_FIELD[name];
      if (field) out[field] = toNumber(row[i]);
    });
    return out;
  });
}
