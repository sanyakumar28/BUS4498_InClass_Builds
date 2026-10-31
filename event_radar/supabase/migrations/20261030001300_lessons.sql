-- Stage 13: lessons (what moderators teach the agent).
-- Only signed-in moderators can write lessons. The agent reads the ones switched on
-- with every post, and never writes a lesson itself.

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lesson text not null check (char_length(lesson) between 5 and 300),
  active boolean not null default true,
  created_by text not null default '',
  from_post uuid
);

alter table public.lessons enable row level security;

-- Moderators (signed in) may read, add, and switch lessons on or off. Visitors get nothing.
create policy "Moderators can read lessons"
  on public.lessons
  for select
  to authenticated
  using (true);

create policy "Moderators can add lessons"
  on public.lessons
  for insert
  to authenticated
  with check (true);

create policy "Moderators can switch lessons on or off"
  on public.lessons
  for update
  to authenticated
  using (true)
  with check (true);

-- Grants: don't rely on the project's defaults.
revoke all on public.lessons from anon, authenticated;
grant select on public.lessons to authenticated;
grant insert (lesson, created_by, from_post) on public.lessons to authenticated;
grant update (active) on public.lessons to authenticated;
grant select, insert, update, delete on public.lessons to service_role;

-- The lessons the agent followed, saved with every decision.
alter table public.events
  add column if not exists lessons_used text[] not null default '{}';
