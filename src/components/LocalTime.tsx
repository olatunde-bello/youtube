"use client";

/** Shows a timestamp in the viewer's own time zone. */
export function LocalTime({ iso }: { iso: string | null }) {
  if (!iso) return <span>never</span>;
  const d = new Date(iso);
  return (
    <time dateTime={iso} title={d.toString()} suppressHydrationWarning>
      {d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
    </time>
  );
}
