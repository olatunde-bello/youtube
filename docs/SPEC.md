# PROJECT: YouTube Dashboard (simple, visual)

Build a simple, visual dashboard for my YouTube channels. I run a few channels and will add more later.

The one job of this tool is to let me open it each morning and see, in under 5 minutes, how my channels are doing, mostly through charts and colour, with very little text to read.

The data must be real. No fake numbers, placeholder metrics, or hardcoded channel data.

I don't write code. Keep the build small. When I need to do something myself, give me click-by-click steps. Whenever there's a choice between a simpler option and a fancier one, pick the simpler one.

---

## WHAT IT DOES

1. I connect my YouTube channels with Google sign-in.
2. Every night it pulls my channels' stats and saves them, so history builds up over time.
3. Every morning it shows a visual dashboard plus a short AI summary.

That's the whole product.

---

## SCREENS (only these three)

### 1. Home (all channels)

- **Big number cards** across the top: views, watch time, subscribers gained, revenue. Each card shows the change against the previous day as a green or red arrow.
- **Line chart**: daily views for the last 28 days, one line per channel.
- **Bar chart**: revenue by channel over the last 28 days.
- **"Today's Brief" card**: 3–5 short sentences from Claude covering what changed, the top video, and one suggested action. It must only describe numbers the app has already calculated.
- **Top 5 videos** of the latest day, each with a thumbnail and a coloured badge.

### 2. Channel page

- The same number cards and charts for one channel, with a time-range switch: 7d / 28d / 90d.
- **Video grid** with thumbnails. Each video gets a coloured badge comparing it to that channel's normal performance at the same age:
  - 🟢 **Breakout**: far above normal
  - 🔵 **Strong**: above normal
  - ⚪ **Normal**
  - 🔴 **Weak**: below normal
- **"What's working" charts**, simple bars only: average views by upload day, by video length, and by topic tag (I tag topics myself).

### 3. Video page

- Thumbnail, title, and publish date.
- A chart of daily views since publishing.
- Number cards for views, watch time, average % viewed, subscribers, and revenue.
- The badge, with a one-line reason (e.g. "2.8× this channel's normal views at day 3").

Plus a small **Settings** page: connected channels, sync status, and reconnect buttons.

---

## RULES FOR THE NUMBERS

- **Show the latest complete day.** YouTube analytics run 1–3 days behind, and revenue can run later still. Label every number with its date. If revenue hasn't arrived, show "pending", never $0.
- **Missing is not zero.** If a metric isn't available, show "—" with a tooltip explaining why.
- **Badges are per channel.** Each channel is compared against its own recent videos, never against global thresholds. If a channel has too few videos to compare, show no badge.
- All numbers and badges are calculated in code. Claude only writes the short summary text from those results.

---

## TECH (keep it simple)

- Next.js + TypeScript + Tailwind, with a simple chart library (e.g. Recharts)
- Supabase for the database, login, and the nightly scheduled job
- Vercel for hosting
- YouTube Data API + YouTube Analytics API, read-only
- Claude API for the brief only, with a daily spend cap (default very low, about one call per day)

**Check the current official docs before building**, and tell me what you found on:

- Which metrics the Analytics API actually provides. Impressions and CTR may not be available. If they aren't easy to get, leave them out of v1.
- Exact read-only OAuth scopes, including the one needed for revenue.
- The Google OAuth "Testing mode" issue: tokens may expire every ~7 days. Explain my options in plain language and recommend one.
- Whether each channel on a separate Brand Account needs its own sign-in.
- Quota. Avoid `search.list`. Use uploads playlists and batched `videos.list` calls.

---

## DESIGN

Clean, dark-mode first, big readable numbers, lots of charts, minimal text. It should feel like a calm control panel, not a busy analytics suite. No gradients, animations, or marketing styling. Desktop first, but it should look fine on my phone.

---

## SECURITY (basics)

- Read-only access to YouTube. The app can never upload, edit, or delete anything.
- Tokens are encrypted, never logged, and never sent to the browser.
- Secrets are kept in environment variables, with a `.env.example` file.

---

## NOT IN THIS VERSION

These are out of scope for now: competitor tracking, idea generators, experiments, chat/Q&A, MCP, notifications, and production-time ROI. Don't build them. Don't design around them either, beyond keeping the database tidy.

---

## HOW TO WORK

1. Check the docs (above) and show me a **one-page plan**: screens, data you'll pull, scopes, estimated monthly cost, and what I'll need to set up.
2. **Step 1:** Google sign-in, connect channels, import existing videos and history, Settings page.
3. **Step 2:** nightly sync, Home, Channel, and Video pages with charts.
4. **Step 3:** badges, "What's working" charts, Today's Brief.

After each step, run tests and type checks, fix any errors, and give me a short "what you can now do" note.

Ask me for credentials only when the step that needs them is ready to test. At the end, write a short SETUP.md with click-by-click instructions for Google Cloud, Supabase, Vercel, and the Claude key.

**Done means:** I open the app in the morning, glance at the charts and badges, read the 4-line brief, and know how my channels did and what to do next.
