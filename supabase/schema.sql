-- Run this in the Supabase SQL editor to create the memos table.

create table if not exists memos (
  id              uuid primary key,
  title           text not null,
  created_at      timestamptz not null default now(),
  audio_url       text not null,
  duration_seconds numeric not null default 0,
  languages       text[] not null default '{}',
  segments        jsonb not null default '[]',
  summary         text not null default '',
  topics          text[] not null default '{}',
  action_items    jsonb not null default '[]'
);

-- Row-level security (optional but recommended for multi-user)
alter table memos enable row level security;

-- For single-user / service-role access only, no RLS policy needed.
-- If you add Clerk + Supabase auth later, add:
-- create policy "owner" on memos using (auth.uid()::text = user_id);

-- Google Calendar OAuth tokens (one row: id = 'default')
create table if not exists google_tokens (
  id             text primary key,
  refresh_token  text,
  access_token   text,
  expiry_date    bigint,
  updated_at     timestamptz not null default now()
);

-- Service-role access only — no RLS needed for this table.

-- Keep-alive heartbeat (one row, upserted by /api/ping cron every 3 days)
create table if not exists heartbeat (
  id         text primary key default 'default',
  pinged_at  timestamptz not null default now()
);
