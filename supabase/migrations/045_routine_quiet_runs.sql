-- How many runs in a row found nothing worth reporting.
--
-- Delivery is quiet when a run comes back empty, decided 2026-08-20: a phone
-- notification punishes empty messages even harder than an inbox does, and the
-- third "nothing today" teaches someone to ignore the useful ones.
--
-- But silence with no explanation reads as breakage. This counter is the hedge,
-- and it costs no extra messages: the NEXT real report opens with "since the
-- last report, 4 runs found nothing new", so the quiet stretch is explained
-- after the fact, by the message that was worth sending anyway.
--
-- Incremented when a run reports nothing, reset to zero when a report is
-- actually delivered. Not derived from routine_runs, because "was this one
-- delivered" is not a fact that table holds: a run can complete with a real
-- report and still not be delivered, when the person has delivery switched off
-- or has never paired.
alter table public.routines
  add column if not exists quiet_runs integer not null default 0;
