-- 012 forgot the SELECT policy: inserts into storage.objects read the new
-- row back, and Postgres checks SELECT visibility for that (same lesson as
-- the agents policies in 007). Avatars are public anyway, so any signed-in
-- user may read rows in this bucket.

create policy "Signed-in users view avatar objects"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
