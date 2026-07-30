-- 033 revoked EXECUTE from anon, but the default PG grant to PUBLIC still
-- covered every role, so anon could still call the helpers via rpc. Revoke
-- the PUBLIC grant and grant back only `authenticated`, which policies need
-- (they evaluate helpers with the caller's privileges).
revoke execute on function public.get_my_role() from public;
revoke execute on function public.is_agent_owner(uuid) from public;
revoke execute on function public.owns_knowledge_source(uuid) from public;
revoke execute on function public.handle_new_user() from public;

grant execute on function public.get_my_role() to authenticated;
grant execute on function public.is_agent_owner(uuid) to authenticated;
grant execute on function public.owns_knowledge_source(uuid) to authenticated;
-- handle_new_user is a trigger function; it runs with the table owner's
-- privileges, so no API role gets EXECUTE.
