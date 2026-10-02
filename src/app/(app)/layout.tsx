import Link from "next/link";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return (
    <>
      <header className="border-b border-line">
        <nav className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <Link href="/" className="font-semibold">
            YouTube Dashboard
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-text">
            Home
          </Link>
          <Link href="/settings" className="ml-auto text-sm text-muted hover:text-text">
            Settings
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </>
  );
}
