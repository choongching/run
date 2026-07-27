-- Per-agent knowledge, rebuilt on the platform shape.
--
-- The old agent_knowledge (008/017) stored Drive POINTERS (file_id, name, mime)
-- keyed by agent. A pointer is only meaningful next to an identity that can read
-- it, and the identity it assumed was the org-wide Drive account on the
-- company_settings singleton. The revamp replaced that with per-user connections
-- (021), so those rows became unresolvable, and resolving them through the org
-- account would have let one user read another user's files through a
-- company-visible agent. Nothing in the app reads the table today; its rows are
-- pre-revamp demo seed data. It goes.
--
-- The replacement separates the two things the old table conflated:
--   knowledge_sources  a source is its own resource, owned by a user, holding a
--                      SNAPSHOT of extracted text rather than a live pointer, so
--                      a run never depends on someone else's credential.
--   agent_knowledge    a link table, so one voice guide can feed several agents
--                      without being stored (or edited) once per agent.

drop table if exists agent_knowledge;

create table knowledge_sources (
  id          uuid        primary key default gen_random_uuid(),
  owner_id    uuid        not null references auth.users(id) on delete cascade,
  title       text        not null,
  -- How the text got here: typed in ('note') or extracted from an upload
  -- ('file'). Future connector-backed sources add their own kind and reuse
  -- checksum/synced_at to refresh the snapshot.
  kind        text        not null default 'note' check (kind in ('note', 'file')),
  content     text        not null,
  -- Denormalized so the budget meter and the prompt composer can size the
  -- library without loading every source's text.
  char_count  integer     not null default 0,
  -- sha256 of content: dedupes re-uploads of an unchanged file and, later,
  -- tells a connector sync whether anything actually changed.
  checksum    text,
  -- Provenance for a file source (name, mime, byte size, truncated flag).
  origin      jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index knowledge_sources_owner_idx
  on knowledge_sources (owner_id, created_at desc);

create trigger knowledge_sources_updated_at
  before update on knowledge_sources
  for each row execute procedure update_updated_at_column();

create table agent_knowledge (
  id         uuid        primary key default gen_random_uuid(),
  agent_id   uuid        not null references agents(id) on delete cascade,
  source_id  uuid        not null references knowledge_sources(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (agent_id, source_id)
);

create index agent_knowledge_source_idx on agent_knowledge (source_id);

alter table knowledge_sources enable row level security;
alter table agent_knowledge enable row level security;

-- A source is personal. Only its owner reads or writes it, admins included:
-- a voice guide holds how someone writes, and nothing in the product needs a
-- second reader. Other people feel an owner's knowledge only indirectly, in how
-- an agent they can see replies, because the composed text is baked into the
-- agent's system prompt at save time rather than read per run.
create policy "Owners manage own knowledge sources"
  on knowledge_sources for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Security definer, matching the 016 helpers: a policy on agent_knowledge can
-- ask "does the caller own this source" without re-entering the source's own
-- policy.
create or replace function owns_knowledge_source(sid uuid)
returns boolean language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from knowledge_sources where id = sid and owner_id = auth.uid()
  );
$$;

-- Attaching is the agent owner's call, and you can only attach a source you own,
-- so a link can never pull another user's text into a prompt.
create policy "Agent owners manage their knowledge links"
  on agent_knowledge for all to authenticated
  using (is_agent_owner(agent_id))
  with check (is_agent_owner(agent_id) and owns_knowledge_source(source_id));
