-- The heartbeat, in the repo.
--
-- Routines run because pg_cron POSTs /api/routines/tick every five minutes.
-- Until now that job existed only in the production database, created by
-- hand in the dashboard, with the bearer token pasted into its command text.
-- Nothing in this repo said the job existed, so one person could switch it
-- off during a call (2026-08-27, they did) and no diff, review, or grep would
-- ever show it. A schedule the code depends on belongs with the code.
--
-- The token is NOT here. It lives in Vault under the name
-- routines_cron_secret and must equal ROUTINES_CRON_SECRET in the Vercel env.
-- Store it once, out of band, never in a migration:
--
--   select vault.create_secret('<value>', 'routines_cron_secret');
--
-- The tick is a function rather than an inline command so that a missing
-- secret RAISES: cron.job_run_details then shows a failed run, where a null
-- header would have posted, been refused with 401, and counted as success.
--
-- The function lives in a schema PostgREST does not expose, so it cannot be
-- called through the API by anon or authenticated. pg_cron runs it as the
-- role that scheduled it (postgres), which is what Vault decryption needs.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create schema if not exists internal;
revoke all on schema internal from public;

create or replace function internal.routines_tick()
returns bigint
language plpgsql
as $$
declare
  secret text;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'routines_cron_secret';

  if secret is null then
    raise exception 'routines_cron_secret is not in Vault; the tick cannot authenticate';
  end if;

  return net.http_post(
    url := 'https://tryrun.today/api/routines/tick',
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret),
    timeout_milliseconds := 8000
  );
end;
$$;

revoke all on function internal.routines_tick() from public;

-- Replace the hand-made job with this one. cron.schedule updates a job that
-- already carries the name, so re-applying is safe.
select cron.schedule(
  'routines-tick',
  '*/5 * * * *',
  'select internal.routines_tick()'
);
