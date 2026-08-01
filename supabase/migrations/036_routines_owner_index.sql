-- The Routines page, the sidebar badge, and the Configure panel all ask the
-- same question: this person's routines, newest first. That path had no index,
-- so it was a sequential scan filtered by user_id. Correct at three rows and
-- quietly wrong later, since every routine anyone creates makes every other
-- person's page a little slower.
--
-- The two existing indexes answer different questions: routines_due_idx is the
-- ticker's (status, next_run_at) and routines_agent_idx is the per-agent read.
-- Neither helps a user-scoped list.
create index if not exists routines_owner_idx
  on public.routines (user_id, created_at desc);
