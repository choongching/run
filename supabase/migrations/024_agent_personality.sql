-- Each agent has a plain-language personality preset that shapes its voice.
-- Composed into the system prompt (see lib/agents/personalities.ts); the
-- default 'balanced' adds no extra voice instruction.
alter table agents add column personality text not null default 'balanced';
