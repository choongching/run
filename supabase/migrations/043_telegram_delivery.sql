-- Routine reports delivered to Telegram.
--
-- Two facts, and they live in different places on purpose:
--
--   1. WHO to send to is a property of the PERSON. Someone has one Telegram
--      identity, and it serves every routine they own. Putting the chat id on
--      the routine would make them pair again for each new routine, which is
--      the friction this whole feature exists to remove.
--   2. WHETHER to send is a property of the ROUTINE. A daily news digest and a
--      weekly finance check are not the same appetite, and intent belongs
--      where the intent was formed.
--
-- No new table: both facts fit on rows that already exist, and both tables
-- already carry RLS scoped to the owner.

-- The Telegram chat this person receives reports in. Null means not paired,
-- which is the normal state and not an error.
--
-- Deliberately NOT unique. Two Run accounts pairing the same Telegram account
-- is rare and harmless, and a unique constraint would turn it into a confusing
-- failure at the moment of pairing, which is the worst possible moment.
--
-- Stored as text, not bigint. Telegram documents chat ids as 64-bit safe but
-- the API returns them in JSON, where JavaScript numbers lose precision above
-- 2^53. Text is what we receive and text is what we send back.
alter table public.profiles
  add column if not exists telegram_chat_id text;

-- When pairing happened. Exists to answer "since when has this been broken?"
-- during a support conversation, which is a question no other column can
-- answer once a chat id has been cleared and re-set.
alter table public.profiles
  add column if not exists telegram_paired_at timestamptz;

-- Whether this routine's reports go to Telegram.
--
-- Default false, so nothing is ever delivered without a deliberate yes. The
-- column being on by default would mean an existing routine started messaging
-- someone's phone because of a migration, which is exactly the kind of
-- surprise the write-approval model exists to prevent.
alter table public.routines
  add column if not exists deliver_telegram boolean not null default false;

-- No index. The executor reads these columns by primary key on rows it has
-- already fetched to run the routine, so there is no new lookup pattern to
-- support. Revisit if a "who has delivery on" query is ever needed.
--
-- No new RLS policies either. profiles and routines already restrict rows to
-- their owner, and these columns inherit that. The chat id is written by the
-- webhook using the service-role client, which bypasses RLS by design, exactly
-- as the search usage counter does.
