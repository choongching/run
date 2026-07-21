-- Advisor fixes: pin search_path on get_my_role (RLS helper), and stop
-- handle_new_user (an auth trigger, never a client RPC) from being callable
-- through the REST API. get_my_role keeps EXECUTE for authenticated because
-- RLS policies evaluate it as the querying role.

alter function get_my_role() set search_path = public;

revoke execute on function handle_new_user() from anon, authenticated;
