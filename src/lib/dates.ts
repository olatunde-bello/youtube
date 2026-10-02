// YouTube Analytics reports by calendar day in US Pacific time.

export type ISODate = string; // YYYY-MM-DD

export function todayPacific(now = new Date()): ISODate {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(now);
}

export function addDays(day: ISODate, n: number): ISODate {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The Pacific calendar day an ISO timestamp falls on. */
export function pacificDayOf(timestamp: string): ISODate {
  return todayPacific(new Date(timestamp));
}

/** Splits [start, end] into consecutive ranges of at most `maxDays` days. */
export function dateChunks(start: ISODate, end: ISODate, maxDays = 365): Array<[ISODate, ISODate]> {
  const chunks: Array<[ISODate, ISODate]> = [];
  let from = start;
  while (from <= end) {
    const to = addDays(from, maxDays - 1) < end ? addDays(from, maxDays - 1) : end;
    chunks.push([from, to]);
    from = addDays(to, 1);
  }
  return chunks;
}
