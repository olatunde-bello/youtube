# YouTube Dashboard

A small, private, read-only dashboard for your YouTube channels. See `docs/SPEC.md` for what it does and `SETUP.md` to get it running.

**Stack:** Next.js 16 + TypeScript + Tailwind · Supabase (Postgres) · Vercel · YouTube Data & Analytics APIs (read-only).

## Status

- [x] Step 1: Google sign-in, connect channels, import videos + daily history, Settings page
- [ ] Step 2: nightly sync, Home / Channel / Video pages with charts
- [ ] Step 3: badges, "What's working" charts, Today's Brief

## For developers

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev                  # http://localhost:3000 (add http://localhost:3000/api/oauth/callback in Google Cloud)
npm run check                # type check + tests
```

Key files:

- `src/lib/importer.ts`: pulls videos (uploads playlist + batched `videos.list`, no `search.list`) and daily history (Analytics API)
- `src/lib/google.ts`: minimal OAuth + API client (fetch, no SDK)
- `src/lib/crypto.ts`: AES-256-GCM token encryption, signed cookies
- `src/proxy.ts`: every route requires login except the sign-in endpoints
- `supabase/migrations/`: database schema (RLS on, no public access)
