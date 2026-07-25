-- Observable runs (phase 6): persist every session event so the mission
-- detail page can replay a run's Activity timeline and tail it live.
-- Everything here is additive; nothing is dropped or renamed.

-- New terminal states. 'stopped' = the user interrupted the run.
-- 'failed' = the run errored (previously it silently reverted to queued;
-- keeping a distinct status lets the board show "Did not finish" while the
-- brief stays re-runnable). Values are not used within this migration, so
-- adding them inside the migration transaction is safe.
alter type mission_status add value if not exists 'stopped';
alter type mission_status add value if not exists 'failed';

-- Why a failed run failed, shown on the run page. Cleared on re-run.
alter table missions add column error_message text;

-- Append-only event log, one row per session event, ordered by id.
-- payload is the raw SDK event (trimmed of oversized fields at write time).
create table mission_events (
  id         bigint      generated always as identity primary key,
  mission_id uuid        not null references missions(id) on delete cascade,
  event_type text        not null,
  payload    jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index mission_events_mission_idx on mission_events (mission_id, id);

alter table mission_events enable row level security;

-- Mirrors the missions policies: owners read and write events for their own
-- missions, admins can read everything. Append-only: no update/delete
-- policies for anyone. Inserts here never use RETURNING, but the owner
-- SELECT policy covers read-back regardless (see supabase-ops rules).

create policy "Users insert events for own missions"
  on mission_events for insert
  with check (
    exists (
      select 1 from missions m
      where m.id = mission_id and m.user_id = auth.uid()
    )
  );

create policy "Users view events for own missions"
  on mission_events for select
  using (
    exists (
      select 1 from missions m
      where m.id = mission_id and m.user_id = auth.uid()
    )
  );

create policy "Admins view all mission events"
  on mission_events for select
  using (get_my_role() = 'admin');
