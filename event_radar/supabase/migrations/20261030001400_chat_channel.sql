-- Stage 14: read posts from a chat group (GroupMe).
-- Each post remembers which chat message it came from, so one message gets one decision.

alter table public.events
  add column if not exists source text not null default '',
  add column if not exists source_id text not null default '',
  add column if not exists source_name text not null default '';

-- One decision per chat message, enforced by the database.
create unique index if not exists events_one_per_message
  on public.events (source, source_id)
  where source_id <> '';

-- The reader's bookmark: the last chat message it read.
create table if not exists public.channel_cursor (
  source text primary key,
  last_id text not null default '',
  read_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.channel_cursor enable row level security;
revoke all on public.channel_cursor from anon, authenticated;
grant select, insert, update, delete on public.channel_cursor to service_role;

-- The scheduled job: call the GroupMe reader every minute.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('read-chat-channel')
where exists (select 1 from cron.job where jobname = 'read-chat-channel');

select cron.schedule(
  'read-chat-channel',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://lvadnnnihgjcrvyuheju.supabase.co/functions/v1/read-channel',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_BMCIcC05XK7m4qCuonbtvA_sL6SGxtD'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
