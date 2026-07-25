-- Guided setup interview: a new agent runs a short adaptive Q&A on first open
-- to learn the user's intent, then saves the brief into its instructions.

alter table agents add column if not exists onboarded boolean not null default false;
alter table agents add column if not exists preferences jsonb;

-- Existing agents predate onboarding and their Managed Agents sessions were
-- created without the ask_user tool; mark them onboarded so only newly created
-- agents (which insert with the default false) run the setup interview.
update agents set onboarded = true where onboarded = false;

-- The running accumulation of question/answer pairs during a thread's onboarding
-- turn, used to compose the saved brief when the interview finishes.
alter table threads add column if not exists setup_answers jsonb;
