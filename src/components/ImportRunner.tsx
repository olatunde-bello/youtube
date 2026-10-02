"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Progress = {
  done: boolean;
  channels: Array<{ id: string; title: string; videosTotal: number; videosPending: number; basicsDone: boolean; error?: string }>;
};

/**
 * Keeps calling /api/import until every channel's history is in.
 * Each call does ~50 seconds of work, so big channels take a few rounds.
 */
export function ImportRunner() {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      while (!cancelled) {
        const res = await fetch("/api/import", { method: "POST" }).catch(() => null);
        const body = res ? await res.json().catch(() => null) : null;
        if (cancelled) return;
        if (!res?.ok || !body) {
          setError(body?.error ?? "Import stopped. Reload the page to try again.");
          break;
        }
        setProgress(body as Progress);
        if ((body as Progress).done) break;
      }
      router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <section className="rounded-xl border border-info/40 bg-info/10 p-4">
      <h2 className="font-medium">Importing your history…</h2>
      <p className="mt-1 text-sm text-muted">Keep this page open. It's safe to leave; the import picks up where it stopped.</p>
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
      <div className="mt-4 space-y-3">
        {progress?.channels.map((c) => {
          const done = c.videosTotal - c.videosPending;
          const pct = !c.basicsDone ? 2 : c.videosTotal === 0 ? 100 : Math.round((done / c.videosTotal) * 100);
          return (
            <div key={c.id}>
              <div className="flex justify-between text-sm">
                <span>{c.title}</span>
                <span className="text-muted">{c.basicsDone ? `${done} / ${c.videosTotal} videos` : "Listing videos…"}</span>
              </div>
              <div className="mt-1 h-2 rounded bg-panel-2">
                <div className={`h-2 rounded ${c.error ? "bg-bad" : "bg-info"}`} style={{ width: `${pct}%` }} />
              </div>
              {c.error && <p className="mt-1 text-xs text-bad">{c.error}</p>}
            </div>
          );
        }) ?? <p className="text-sm text-muted">Starting…</p>}
      </div>
    </section>
  );
}
