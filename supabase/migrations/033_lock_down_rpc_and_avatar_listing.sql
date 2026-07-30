-- Two hardenings from the security advisors (2026-07-30 RLS audit).
--
-- 1. The RLS helper functions are SECURITY DEFINER and were executable via
--    /rest/v1/rpc by anyone, including anonymous visitors. Policies evaluate
--    them with the querying user's privileges, so `authenticated` must keep
--    EXECUTE on the three helpers used in policies, but `anon` never passes
--    any policy here and has no business calling them directly.
--    handle_new_user is a trigger function; triggers fire with the table
--    owner's privileges, so no API role needs EXECUTE on it at all.
revoke execute on function public.get_my_role() from anon;
revoke execute on function public.is_agent_owner(uuid) from anon;
revoke execute on function public.owns_knowledge_source(uuid) from anon;
revoke execute on function public.handle_new_user() from anon, authenticated;

-- 2. The avatars bucket is public (objects are served by URL), but its broad
--    SELECT policy let any signed-in user LIST every object in the bucket.
--    The policy cannot simply be dropped: the storage API reads the object
--    row back after an upload, so an upload with no SELECT visibility on the
--    new row fails (learned in 007 and 013). Scoped to the uploader's own
--    folder instead: uploads keep working, listing other people's files does
--    not.
drop policy "Signed-in users view avatar objects" on storage.objects;
create policy "Users view own avatar objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
