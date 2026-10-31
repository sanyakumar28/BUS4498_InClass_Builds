-- Stage 12: the club's earlier posts (memory of what happened).
-- An update can retire the post it replaces, so a fifth status, "replaced", is allowed.

alter table public.events drop constraint if exists events_status_check;
alter table public.events add constraint events_status_check
  check (status in ('published', 'waiting', 'rejected', 'archived', 'replaced'));

-- replaced_by: the newer post that retired this one.
-- updates_id: on a waiting update, the earlier post it will retire once a moderator approves it.
alter table public.events
  add column if not exists replaced_by uuid,
  add column if not exists updates_id uuid;

-- Moderators may now also mark a post "replaced" (approving a waiting update retires the earlier post).
drop policy if exists "Moderators can review events" on public.events;
create policy "Moderators can review events"
  on public.events
  for update
  to authenticated
  using (true)
  with check (status in ('published', 'waiting', 'rejected', 'replaced'));
