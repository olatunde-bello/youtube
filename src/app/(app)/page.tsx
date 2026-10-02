import Image from "next/image";
import Link from "next/link";
import { listPublicChannels, videoCounts } from "@/lib/db";

// Step 1 placeholder. The charts arrive in Step 2.
export default async function HomePage() {
  const channels = await listPublicChannels();
  if (channels.length === 0) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-xl border border-line bg-panel p-8 text-center">
        <h1 className="text-xl font-semibold">Connect your first channel</h1>
        <p className="mt-2 text-sm text-muted">Sign in with the Google account that owns the channel. Read-only access.</p>
        <a href="/api/connect" className="mt-6 inline-block rounded-md bg-info px-4 py-2.5 font-medium text-bg hover:opacity-90">
          Connect a channel
        </a>
      </div>
    );
  }
  const counts = await videoCounts(channels.map((c) => c.id));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Your channels</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((c) => (
          <div key={c.id} className="flex items-center gap-4 rounded-xl border border-line bg-panel p-4">
            {c.thumbnail_url && <Image src={c.thumbnail_url} alt="" width={48} height={48} className="rounded-full" />}
            <div>
              <div className="font-medium">{c.title}</div>
              <div className="text-sm text-muted">{counts[c.id]?.total ?? 0} videos imported</div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted">
        Charts and daily numbers arrive in the next step. Manage channels in <Link href="/settings" className="underline">Settings</Link>.
      </p>
    </div>
  );
}
