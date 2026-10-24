-- Stage 8: moderator sign-in.
-- A signed-in moderator can see every post and approve or reject waiting ones.
-- This is safe only because new sign-ups are turned off: every signed-in user is a moderator
-- created by hand in Authentication → Users.

-- Moderators may read every post, not just published ones.
create policy "Moderators can read every event"
  on public.events
  for select
  to authenticated
  using (true);

-- Moderators may change a post's status, but only to published, waiting, or rejected.
create policy "Moderators can review events"
  on public.events
  for update
  to authenticated
  using (true)
  with check (status in ('published', 'waiting', 'rejected'));

-- Grants: moderators read the whole table, and may change only the review columns.
grant select on public.events to authenticated;
grant update (status, status_reason, reviewed_at, reviewed_by) on public.events to authenticated;
