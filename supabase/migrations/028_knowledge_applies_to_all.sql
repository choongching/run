-- Let a knowledge source apply to every agent its owner has.
--
-- Until now a source reached an agent only through an explicit row in
-- agent_knowledge. That is right for a product spec that one agent needs, and
-- wrong for the thing people actually keep in a library: a voice guide, a
-- glossary, the facts about their company. Those belong to all of their agents,
-- and attaching them one by one means the day you add a fourth agent it quietly
-- writes in the wrong voice.
--
-- The flag lives on the source rather than on a link table, because "this
-- applies everywhere" is a property of the material, not of a pairing. Explicit
-- links keep working exactly as before; at compose time the two sets are unioned
-- and deduped, so a source that is both flagged and linked is still composed
-- once.
--
-- No policy changes: knowledge_sources is already owner-scoped for all
-- commands, and this column is only ever read for agents with the same owner.

alter table knowledge_sources
  add column if not exists applies_to_all boolean not null default false;

-- The compose path asks one question of this table: which of this owner's
-- sources apply everywhere. Existing rows are all false, so the index stays
-- small and only carries the rows that are actually looked up.
create index if not exists knowledge_sources_applies_to_all_idx
  on knowledge_sources (owner_id)
  where applies_to_all;
