import Image from "next/image";
import { ImportRunner } from "@/components/ImportRunner";
import { LocalTime } from "@/components/LocalTime";
import { listPublicChannels, recentSyncLog, videoCounts, type PublicChannel } from "@/lib/db";

const NOTICES: Record<string, { tone: "good" | "bad"; text: string }> = {
  connected: { tone: "good", text: "Channel connected. Importing its history now." },
  scopes: { tone: "bad", text: "Some permissions were unticked on Google's screen. Click Connect again and leave all boxes ticked." },
  no_refresh: { tone: "bad", text: "Google didn't give a long-term sign-in. Please click Connect again." },
  no_channel: { tone: "bad", text: "That Google account has no YouTube channel. When Google asks, pick the account that owns the channel." },
  cancelled: { tone: "bad", text: "Connecting was cancelled." },
  google: { tone: "bad", text: "Google sign-in failed. Please try again." },
};

function StatusChip({ channel, pending }: { channel: PublicChannel; pending: number }) {
  if (channel.connection_status === "needs_reconnect")
    return <span className="rounded-full bg-bad/15 px-2 py-0.5 text-xs text-bad">Needs reconnect</span>;
  if (!channel.channel_history_done || pending > 0)
    return <span className="rounded-full bg-info/15 px-2 py-0.5 text-xs text-info">Importing</span>;
  if (channel.last_sync_ok === false)
    return <span className="rounded-full bg-warn/15 px-2 py-0.5 text-xs text-warn">Problem</span>;
  return <span className="rounded-full bg-good/15 px-2 py-0.5 text-xs text-good">Connected</span>;
}

function RevenueStatus({ status }: { status: PublicChannel["revenue_status"] }) {
  if (status === "available") return <span>Revenue: on</span>;
  if (status === "unavailable")
    return (
      <span title="YouTube didn't share revenue for this channel. Usually it isn't monetised, or the revenue permission was unticked when connecting.">
        Revenue: — <span className="cursor-help underline decoration-dotted">why?</span>
      </span>
    );
  return <span>Revenue: checking…</span>;
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const params = await searchParams;
  const [channels, log] = await Promise.all([listPublicChannels(), recentSyncLog()]);
  const counts = await videoCounts(channels.map((c) => c.id));
  const importing = channels.some(
    (c) => c.connection_status === "ok" && (!c.channel_history_done || (counts[c.id]?.pending ?? 0) > 0),
  );
  const notice = params.connected ? NOTICES.connected : params.error ? NOTICES[params.error] ?? NOTICES.google : null;
  const titles = Object.fromEntries(channels.map((c) => [c.id, c.title]));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {notice && (
        <p className={`rounded-md px-4 py-3 text-sm ${notice.tone === "good" ? "bg-good/15 text-good" : "bg-bad/15 text-bad"}`}>{notice.text}</p>
      )}

      {importing && <ImportRunner />}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Connected channels</h2>
          <a href="/api/connect" className="rounded-md bg-info px-4 py-2 text-sm font-medium text-bg hover:opacity-90">
            + Connect a channel
          </a>
        </div>
        <p className="text-sm text-muted">
          Each channel signs in once. When Google shows the account list, pick the channel you want (Brand Account channels are listed
          there too). If Google says “Google hasn’t verified this app”, click <b>Advanced</b> → <b>Go to … (unsafe)</b>. That’s your
          own app.
        </p>

        {channels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-10 text-center text-muted">No channels yet.</div>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-panel">
            {channels.map((c) => {
              const count = counts[c.id] ?? { total: 0, pending: 0 };
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-4 p-4">
                  {c.thumbnail_url ? (
                    <Image src={c.thumbnail_url} alt="" width={48} height={48} className="rounded-full" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-panel-2" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.title}</span>
                      <StatusChip channel={c} pending={count.pending} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted">
                      <span>{count.total} videos</span>
                      <RevenueStatus status={c.revenue_status} />
                      <span>
                        Last activity: <LocalTime iso={c.last_sync_at ?? c.connected_at} />
                      </span>
                    </div>
                    {c.last_sync_message && c.last_sync_ok === false && <p className="mt-1 text-sm text-bad">{c.last_sync_message}</p>}
                  </div>
                  <a href="/api/connect" className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-panel-2">
                    Reconnect
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent activity</h2>
        {log.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {log.map((l) => (
              <li key={l.id} className="flex gap-3">
                <span className={l.ok ? "text-good" : "text-bad"}>{l.ok ? "●" : "▲"}</span>
                <span className="text-muted">
                  <LocalTime iso={l.created_at} />
                </span>
                <span>
                  {l.channel_id ? `${titles[l.channel_id] ?? l.channel_id}: ` : ""}
                  {l.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action="/api/auth/logout" method="post">
        <button className="text-sm text-muted underline hover:text-text">Sign out</button>
      </form>
    </div>
  );
}
