-- YouTube Dashboard: initial schema.
-- Paste this whole file into Supabase → SQL Editor → New query → Run.

-- One row per connected YouTube channel.
create table if not exists channels (
  id                    text primary key,            -- YouTube channel ID (UC...)
  title                 text not null,
  thumbnail_url         text,
  uploads_playlist_id   text not null,
  channel_created_at    timestamptz,
  refresh_token_enc     text not null,               -- AES-256-GCM encrypted, never sent to the browser
  granted_scopes        text not null default '',
  connection_status     text not null default 'ok'
                        check (connection_status in ('ok', 'needs_reconnect')),
  revenue_status        text not null default 'unknown'
                        check (revenue_status in ('unknown', 'available', 'unavailable')),
  channel_history_done  boolean not null default false,
  last_sync_at          timestamptz,
  last_sync_ok          boolean,
  last_sync_message     text,
  connected_at          timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Every upload on a connected channel.
create table if not exists videos (
  id                text primary key,                -- YouTube video ID
  channel_id        text not null references channels(id) on delete cascade,
  title             text not null,
  published_at      timestamptz not null,
  duration_seconds  integer,
  is_short          boolean not null default false,
  privacy_status    text,
  thumbnail_url     text,
  history_done      boolean not null default false,  -- daily history imported?
  updated_at        timestamptz not null default now()
);
create index if not exists videos_channel_published on videos (channel_id, published_at desc);
create index if not exists videos_history_pending on videos (channel_id) where history_done = false;

-- Daily channel totals from the YouTube Analytics API.
-- A NULL metric means "not available", never zero.
create table if not exists channel_daily (
  channel_id     text not null references channels(id) on delete cascade,
  day            date not null,
  views          bigint,
  watch_minutes  numeric,
  avg_view_pct   numeric,
  subs_gained    integer,
  subs_lost      integer,
  revenue        numeric,
  fetched_at     timestamptz not null default now(),
  primary key (channel_id, day)
);

-- Daily per-video numbers.
create table if not exists video_daily (
  video_id       text not null references videos(id) on delete cascade,
  channel_id     text not null references channels(id) on delete cascade,
  day            date not null,
  views          bigint,
  watch_minutes  numeric,
  avg_view_pct   numeric,
  subs_gained    integer,
  subs_lost      integer,
  revenue        numeric,
  fetched_at     timestamptz not null default now(),
  primary key (video_id, day)
);
create index if not exists video_daily_channel_day on video_daily (channel_id, day);

-- A short log of imports and syncs, shown on the Settings page.
create table if not exists sync_log (
  id           bigserial primary key,
  channel_id   text references channels(id) on delete cascade,
  kind         text not null,                        -- 'import' | 'sync'
  ok           boolean not null,
  message      text,
  created_at   timestamptz not null default now()
);
create index if not exists sync_log_created on sync_log (created_at desc);

-- Lock everything down. The app talks to the database only from the server
-- with the secret key, which bypasses these rules. With no policies, the
-- public "anon" key can read and write nothing.
alter table channels      enable row level security;
alter table videos        enable row level security;
alter table channel_daily enable row level security;
alter table video_daily   enable row level security;
alter table sync_log      enable row level security;
