-- When a routine wanted to deliver and could not, and whether we have said so.
--
-- The silent-forever case, called critical by the founder on 2026-08-20: you
-- switch delivery on, never finish pairing, and nothing sends. No error, no
-- complaint, nothing in the thread. A daily routine can run for a month in
-- that state, doing its work properly every morning and reaching nobody, and
-- the only place that says so is a sheet you have no reason to open.
--
-- So a run that wanted Telegram and had nowhere to send leaves one line in the
-- thread. ONE line, which is what this column is for: a timestamp of the last
-- time we said it, so thirty runs do not write thirty identical complaints.
-- It is cleared on a successful delivery, so if someone unpairs later they are
-- told again rather than being met with a silence we already used up.
--
-- Deliberately not a boolean. The timestamp answers "since when", which is the
-- question anyone asks when they notice reports stopped, and it costs the same
-- to store.
alter table public.routines
  add column if not exists unpaired_notice_at timestamptz;
