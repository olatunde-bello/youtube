const ERRORS: Record<string, string> = {
  not_allowed: "That Google account isn't on the allowed list (ALLOWED_EMAILS).",
  expired: "The sign-in took too long or was interrupted. Please try again.",
  cancelled: "Sign-in was cancelled.",
  google: "Google sign-in failed. Please try again.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-panel p-8 text-center">
        <h1 className="text-xl font-semibold">YouTube Dashboard</h1>
        <p className="mt-2 text-sm text-muted">Sign in to see your channels.</p>
        {error && <p className="mt-4 rounded-md bg-bad/15 px-3 py-2 text-sm text-bad">{ERRORS[error] ?? "Something went wrong."}</p>}
        <a href="/api/auth/login" className="mt-6 block rounded-md bg-info px-4 py-2.5 font-medium text-bg hover:opacity-90">
          Sign in with Google
        </a>
      </div>
    </main>
  );
}
