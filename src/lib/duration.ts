// YouTube gives video lengths as ISO 8601 durations, e.g. "PT1H2M3S".

export function parseIsoDuration(value: string | undefined | null): number | null {
  if (!value) return null;
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value);
  if (!m) return null;
  const [, d, h, min, s] = m.map((x) => (x ? Number(x) : 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

/**
 * The API has no "is this a Short" flag. Shorts can be up to 3 minutes long,
 * so we treat anything 3 minutes or shorter as a Short. A short horizontal
 * video will be counted as a Short too; that's an accepted simplification.
 */
export const SHORT_MAX_SECONDS = 180;

export function isLikelyShort(seconds: number | null): boolean {
  return seconds !== null && seconds > 0 && seconds <= SHORT_MAX_SECONDS;
}
