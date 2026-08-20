-- Move the Telegram pairing off `profiles`, which is world-readable.
--
-- Migration 043 put `telegram_chat_id` on `profiles` because that is where the
-- fact logically belongs: one Telegram identity per person. That reasoning was
-- right and the placement was wrong, and an RLS probe is what found it.
--
-- `profiles` carries the policy "Users can view all profiles" with USING
-- (true). Verified 2026-08-20 by probing as an authenticated role with a
-- made-up sub: all 7 rows readable. That policy is deliberate and correct for
-- what profiles held before, which is display names and avatars, the things
-- one person is meant to see about another. It is wrong for a Telegram chat
-- id, which is a stable personal identifier and, worse, an actionable one:
-- read someone else's id, write it onto your own profile (RLS is row-level,
-- not column-level, and people may update their own row), and your routine
-- reports are delivered to their phone.
--
-- Nothing leaked. The column was empty, because nobody has paired yet, which
-- is the only reason this is a design correction and not an incident.
--
-- The fix is a table of its own with the shape the search_usage rollup uses:
-- read your own row, and no write policy at all, so the only writer is the
-- service-role client behind the webhook.

create table if not exists public.user_telegram (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  -- Text, not bigint: Telegram returns chat ids in JSON, where JavaScript
  -- numbers lose precision above 2^53.
  chat_id   text        not null,
  paired_at timestamptz not null default now()
);

-- Deliberately NOT unique on chat_id. Two Run accounts pairing the same
-- Telegram account is rare and harmless, and a unique constraint would turn it
-- into a confusing failure at the moment of pairing, which is the worst moment
-- for a confusing failure.

-- The webhook looks a person up BY chat id when they send /stop, which is the
-- one read that is not by primary key.
create index if not exists user_telegram_chat_idx on public.user_telegram (chat_id);

alter table public.user_telegram enable row level security;

-- Read your own pairing, so the app can show whether delivery is connected.
-- There is deliberately NO insert, update, or delete policy: pairing is
-- established by the webhook after Telegram confirms the person pressed Start,
-- and a self-writable chat id would let anyone skip that proof and point their
-- reports anywhere. Unpairing from the app goes through a server action using
-- the service-role client, the same way usage rows are written.
drop policy if exists "read own telegram pairing" on public.user_telegram;
create policy "read own telegram pairing" on public.user_telegram
  for select using (auth.uid() = user_id);

-- Carry across anything 043 stored. Expected to move zero rows: the probe that
-- prompted this migration showed no pairings existed. Written anyway, because
-- a migration that assumes an empty table is a migration that corrupts a
-- non-empty one.
insert into public.user_telegram (user_id, chat_id, paired_at)
select id, telegram_chat_id, coalesce(telegram_paired_at, now())
from public.profiles
where telegram_chat_id is not null
on conflict (user_id) do nothing;

alter table public.profiles drop column if exists telegram_chat_id;
alter table public.profiles drop column if exists telegram_paired_at;

-- `routines.deliver_telegram` stays where 043 put it. It is a preference, not
-- an identifier: knowing that someone's routine sends to Telegram reveals
-- nothing about them and cannot be used to reach them. It also lives on a
-- table whose RLS is already scoped to the owner, unlike profiles.
