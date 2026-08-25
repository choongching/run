-- Where a source came from.
--
-- A source is created inside one agent's Configure panel ("it wrote that in
-- the wrong voice"), then lives in the library on its own. The link table says
-- which agents USE it today, which is a different question from where it came
-- from: detach it everywhere and the answer to "where did this come from"
-- disappears with the last link. That is exactly the source this page exists
-- to rescue, so the origin is recorded once, at creation, and kept.
--
-- Nullable on purpose. Sources created before this column existed are
-- backfilled from their earliest link, and one that was never linked (or whose
-- agent is gone) keeps a null and simply says nothing rather than guessing.
alter table knowledge_sources
  add column source_agent_id uuid references agents(id) on delete set null;

comment on column knowledge_sources.source_agent_id is
  'The agent this source was created in. Not who uses it: that is agent_knowledge.';

-- Backfill: the agent it was first attached to. For every source that still
-- has a link this IS the creating agent, because creation attaches in the same
-- action, and nothing else can attach a source before that.
update knowledge_sources s
   set source_agent_id = (
     select k.agent_id
       from agent_knowledge k
      where k.source_id = s.id
      order by k.created_at asc
      limit 1
   )
 where s.source_agent_id is null;
