-- Revamp phase 3: per-user tool connections. Each user connects their own
-- Gmail / Google Drive through Pipedream Connect (external_user_id = the
-- user's own uuid); agents act on the signed-in user's accounts. This
-- replaces the company-level Drive model for the personal-assistant vision.
-- The company_settings Drive columns stay for now (dormant); cleanup later.

create table user_connections (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references auth.users(id) on delete cascade,
  -- Pipedream app slug: 'gmail' or 'google_drive'. Gmail and Drive are
  -- SEPARATE Pipedream apps with separate accounts and OAuth scopes.
  app                  text        not null,
  pipedream_account_id text        not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- One live connection per app per user; a reconnect updates the row.
create unique index user_connections_user_app_key on user_connections (user_id, app);

create trigger user_connections_updated_at
  before update on user_connections
  for each row execute procedure update_updated_at_column();

alter table user_connections enable row level security;

-- Owner-only: a connection is private to the user who made it. The SELECT
-- policy also covers insert/update read-back (see supabase-ops rules).
create policy "Users view own connections"
  on user_connections for select using (auth.uid() = user_id);

create policy "Users insert own connections"
  on user_connections for insert with check (auth.uid() = user_id);

create policy "Users update own connections"
  on user_connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own connections"
  on user_connections for delete using (auth.uid() = user_id);
