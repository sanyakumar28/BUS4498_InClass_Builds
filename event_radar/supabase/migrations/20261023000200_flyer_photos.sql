-- Stage 7: photo uploads.
-- Each post can have one flyer photo. The agent uploads it; the website only shows it.

alter table public.events
  add column flyer_url text not null default '';

-- Visitors may read the flyer link, like the other public columns.
grant select (flyer_url) on public.events to anon, authenticated;

-- A public storage bucket for flyers: 5 MB at most, JPG and PNG only.
-- The website gets no storage policies, so only the agent (secret key) can upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('flyers', 'flyers', true, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
