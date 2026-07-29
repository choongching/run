-- Three indexes on usage_events covered the same ground.
--
--   usage_events_user_month_idx    btree (user_id, created_at desc)
--   usage_events_user_created_idx  btree (user_id, created_at desc)   <- identical
--   usage_events_user_idx          btree (user_id)                    <- a prefix of it
--
-- The second is a byte-for-byte duplicate of the first, added when the history
-- work re-declared an index the allowance work had already created. The third
-- is redundant for the same reason a phone book sorted by surname then first
-- name already answers "find every Smith": a composite index serves any query
-- that filters on its leading column.
--
-- Postgres maintains every index on every insert, so the two extra ones bought
-- nothing on reads and cost write time on a table that gains a row on every
-- single run. Dropping them leaves the queries that matter (the monthly count
-- and the history list, both user_id plus a created_at range) on exactly the
-- index they were already using.

drop index if exists usage_events_user_created_idx;
drop index if exists usage_events_user_idx;
