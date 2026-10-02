"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-bad/40 bg-panel p-8 text-center">
      <h1 className="text-lg font-semibold">Something went wrong loading this page</h1>
      <p className="mt-2 text-sm text-muted">
        Most often the app can’t reach the database. Check that SUPABASE_URL and SUPABASE_SECRET_KEY are set, and that the setup SQL has
        been run (see SETUP.md).
      </p>
      <button onClick={reset} className="mt-6 rounded-md border border-line px-4 py-2 text-sm hover:bg-panel-2">
        Try again
      </button>
    </div>
  );
}
