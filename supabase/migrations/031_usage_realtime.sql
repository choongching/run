-- Let a usage meter update itself without a page refresh.
--
-- A run is recorded after the turn ends, from the server, and the number it
-- changes is shown in the shell rather than in the conversation. So the page
-- that needs to hear about it is usually not the page that caused it: another
-- tab, another device, or later a scheduled run nobody is watching at all.
-- Broadcasting the insert is the only way that meter stays honest.
--
-- Realtime applies the table's own row-level security to each change before
-- delivering it, so a person is sent their own runs and nobody else's, using
-- the policies that already exist. Nothing here widens what anyone can read.
--
-- Only inserts matter: a usage row is written once and never edited.

alter publication supabase_realtime add table usage_events;
