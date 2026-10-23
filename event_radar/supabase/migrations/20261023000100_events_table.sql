-- Stage 4: the database.
-- The events table saves every post and its status. It is the agent's memory.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'waiting'
    check (status in ('published', 'waiting', 'rejected', 'archived')),
  status_reason text not null default '',
  announcement text not null
    check (char_length(announcement) between 1 and 2000),
  title text not null default '',
  club text not null default '',
  event_date date,
  start_time time,
  end_time time,
  place_code text not null default '',
  place_name text not null default '',
  place_detail text not null default '',
  cost text not null default '',
  free_food boolean not null default false,
  summary text not null default '',
  rule_flags text[] not null default '{}',
  note_for_moderator text not null default '',
  -- "date|start time|place code", set only when all three are known.
  -- Left empty (null) otherwise, so posts without a key never count as duplicates.
  dedupe_key text,
  ai_model text not null default '',
  reviewed_at timestamptz,
  reviewed_by text not null default ''
);

-- The duplicate check: only one live post per date, start time, and place.
create unique index events_dedupe_key_live
  on public.events (dedupe_key)
  where dedupe_key is not null and status in ('published', 'waiting');

-- Security rules: row-level security on, and visitors may read published posts only.
alter table public.events enable row level security;

create policy "Visitors can read published events"
  on public.events
  for select
  to anon, authenticated
  using (status = 'published');

-- Grants: start from nothing, then allow only what the website needs.
revoke all on table public.events from anon, authenticated;

grant select (
  id, created_at, status, title, club, event_date, start_time, end_time,
  place_name, place_detail, cost, free_food, summary
) on public.events to anon, authenticated;

-- The agent (Edge Function) uses the secret key, which acts as service_role.
grant select, insert, update, delete on public.events to service_role;
