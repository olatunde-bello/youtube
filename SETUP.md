# Setup

This guide gets the dashboard running on the internet so you can sign in. It takes about 30–40 minutes the first time. You'll set up four things: **Supabase** (database), **Google Cloud** (sign-in + YouTube access), **Vercel** (hosting) and finally the app's settings.

Keep a notes file open as you go. You'll copy several values into it.

> The Claude key is only needed for the "Today's Brief" card, which comes in Step 3. This guide will gain a section for it then.

---

## 1. Supabase (the database), about 5 minutes

1. Go to **https://supabase.com** → **Start your project** → sign in (GitHub sign-in is easiest).
2. Click **New project**.
   - **Name:** `youtube-dashboard`
   - **Database password:** click **Generate a password** (you won't need it again, but save it in your notes).
   - **Region:** pick the one closest to you.
   - Click **Create new project** and wait ~1 minute.
3. In the left sidebar click **SQL Editor** → **New query**.
4. Open the file `supabase/migrations/001_init.sql` from this repository, copy **all** of it, paste it into the editor, then click **Run**. You should see "Success. No rows returned".
5. In the left sidebar click **Project Settings** (gear icon) → **Data API**. Copy the **Project URL** into your notes as `SUPABASE_URL`.
6. Still in Project Settings, click **API Keys**. Copy the **secret** key (starts with `sb_secret_`; you may need to click **Reveal**) into your notes as `SUPABASE_SECRET_KEY`.
   - If you only see "Legacy API keys", copy the **service_role** key instead. It works the same.
   - ⚠️ This key is like a master password for the database. Never share it or paste it anywhere public.

## 2. Vercel (hosting), part 1, about 5 minutes

We create the Vercel project first so you know your app's web address, which Google needs.

1. Go to **https://vercel.com** → **Sign Up** → **Continue with GitHub**.
2. Click **Add New…** → **Project**.
3. Find the `youtube` repository and click **Import**. (If it's not listed, click **Adjust GitHub App Permissions** and allow access to it.)
4. Leave every setting as it is and click **Deploy**. The first deploy will **fail or show errors**. That's expected; the settings aren't in yet.
5. Open the project → **Settings** → **Domains**. Copy the address ending in `.vercel.app` (e.g. `youtube-dashboard-abc.vercel.app`). In your notes, write it as `APP_URL=https://<that address>` (with `https://`, no slash at the end).

## 3. Google Cloud (sign-in and YouTube access), about 15 minutes

1. Go to **https://console.cloud.google.com** and sign in with your Google account.
2. At the top, click the project picker → **New Project** → name it `youtube-dashboard` → **Create**. Make sure the new project is selected in the picker.
3. **Turn on the two YouTube APIs:**
   1. Search bar at the top → type **YouTube Data API v3** → open it → **Enable**.
   2. Search bar → **YouTube Analytics API** → open it → **Enable**.
4. **Set up the consent screen:** left menu (☰) → **APIs & Services** → **OAuth consent screen** (it may be called **Google Auth Platform**). Click **Get started**.
   - **App name:** `YouTube Dashboard`. **User support email:** your email. → **Next**
   - **Audience:** **External** → **Next**
   - **Contact information:** your email → **Next** → tick the agreement → **Create**.
5. **Add the permissions (scopes):** in the same area click **Data Access** → **Add or remove scopes**. In the filter box, find and tick these, then click **Update** → **Save**:
   - `.../auth/youtube.readonly`
   - `.../auth/yt-analytics.readonly`
   - `.../auth/yt-analytics-monetary.readonly`
   - `openid` and `.../auth/userinfo.email`
6. **Make sign-ins last (the "7-day" fix):** click **Audience** → under *Publishing status* click **Publish app** → **Confirm**.
   - Google may say verification is needed. **You don't need to submit for verification.** Your app works for you; you'll just see a "Google hasn't verified this app" warning when connecting, which you click past. Your connections won't expire every 7 days.
7. **Create the login keys:** click **Clients** (or **Credentials** → **Create credentials** → **OAuth client ID**).
   - **Application type:** **Web application**
   - **Name:** `YouTube Dashboard`
   - Under **Authorized redirect URIs** click **Add URI** and paste your `APP_URL` followed by `/api/oauth/callback`, e.g.
     `https://youtube-dashboard-abc.vercel.app/api/oauth/callback`
   - Click **Create**. Copy the **Client ID** and **Client secret** into your notes as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## 4. Make your app secret, 1 minute

The app needs one long random password to protect your login and encrypt your YouTube tokens.

1. Go to **https://www.random.org/strings/?num=1&len=48&digits=on&upperalpha=on&loweralpha=on&unique=off&format=html&rnd=new**
2. Copy the 48-character string into your notes as `APP_SECRET`.
   - Keep it safe. If you change it later, you'll need to sign in and reconnect every channel again.

## 5. Vercel, part 2: add the settings, about 5 minutes

1. In Vercel, open your project → **Settings** → **Environment Variables**.
2. Add each of these (Name → Value), leaving "All Environments" selected, clicking **Save** after each:

   | Name | Value |
   |---|---|
   | `APP_URL` | e.g. `https://youtube-dashboard-abc.vercel.app` |
   | `ALLOWED_EMAILS` | the Google email you'll log in with (several? separate with commas) |
   | `APP_SECRET` | from step 4 |
   | `GOOGLE_CLIENT_ID` | from step 3.7 |
   | `GOOGLE_CLIENT_SECRET` | from step 3.7 |
   | `SUPABASE_URL` | from step 1.5 |
   | `SUPABASE_SECRET_KEY` | from step 1.6 |

3. Go to the **Deployments** tab → click the **⋯** next to the latest deployment → **Redeploy** → **Redeploy**.

## 6. Try it

1. Open your `APP_URL`. You should see **Sign in with Google**. Sign in with the email from `ALLOWED_EMAILS`.
2. Click **Connect a channel**.
   - Pick the account for the channel. **Brand Account channels appear in this list too.**
   - If you see **"Google hasn't verified this app"**, click **Advanced** → **Go to YouTube Dashboard (unsafe)**. It's your own app.
   - Leave **all** permission boxes ticked and click **Continue**.
3. You land on **Settings** and the import starts. Keep the page open until the bars finish (a few minutes for most channels).
4. Repeat **Connect a channel** for each of your other channels.

### If something goes wrong

| You see | Fix |
|---|---|
| `Error 400: redirect_uri_mismatch` | The redirect URI in Google Cloud (step 3.7) must be exactly `APP_URL` + `/api/oauth/callback`, with `https` and no extra slash. |
| "That Google account isn't on the allowed list" | Check `ALLOWED_EMAILS` in Vercel, then redeploy. |
| "Something went wrong loading this page" | Check `SUPABASE_URL` / `SUPABASE_SECRET_KEY`, and that you ran the SQL in step 1.4. |
| A channel says **Needs reconnect** | Click **Reconnect** next to it and sign in to that channel again. |
| "Revenue: —" | YouTube didn't share revenue: the channel isn't monetised, or the revenue box was unticked. Reconnect with all boxes ticked. |
