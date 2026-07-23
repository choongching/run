-- Org-level Google Drive connection (via Pipedream Connect) lives on the
-- company_settings singleton: one admin connects Drive for the whole company.
-- The app stores only the Pipedream account id, never Google tokens.

alter table company_settings
  add column pipedream_account_id text,
  add column pipedream_connected_by uuid references auth.users(id) on delete set null;

-- Agent knowledge: admin-pinned Drive files per agent. Only metadata is
-- stored (id, name, mime type); file contents are fetched fresh from Drive
-- at mission run time.

create table agent_knowledge (
  id             uuid        primary key default gen_random_uuid(),
  agent_id       uuid        not null references agents(id) on delete cascade,
  file_id        text        not null,
  file_name      text        not null,
  file_mime_type text        not null,
  created_at     timestamptz not null default now(),
  unique (agent_id, file_id)
);

alter table agent_knowledge enable row level security;

-- Same audience-scoped shape as the agents policies: admins manage
-- everything; members read knowledge only for active agents assigned to them
-- (mission runs read it via the user's own session client).

create policy "Admins manage agent knowledge"
  on agent_knowledge for all
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "Users view knowledge of assigned active agents"
  on agent_knowledge for select to authenticated
  using (
    exists (
      select 1
      from agents a
      join user_agents ua on ua.agent_id = a.id
      where a.id = agent_knowledge.agent_id
        and a.status = 'active'
        and ua.user_id = auth.uid()
        and ua.is_active
    )
  );
