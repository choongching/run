-- Make open chats pick up the new tool set.
--
-- Tools bind when a session is created, and ensureSession returns early when a
-- thread already has a session_id. So without this, the deploy that turns our
-- search on would reach routines immediately (they build a fresh session every
-- run) and reach open chat threads never. The same person would get our
-- provider from their morning routine and Anthropic's built-in search from the
-- conversation they had open, at twenty times the price, with no way to tell
-- the difference from the outside.
--
-- Nulling session_id is safe: the next turn rebuilds the session, and a rebuild
-- already carries a recap, so the conversation does not lose its thread.
--
-- WITH ONE EXCEPTION, which is the whole reason this is not a one-line update.
-- A thread holding pending_tools is waiting on an approval card. The approve
-- route looks the pending call up against the live session, so nulling the
-- session id turns that card into a 409 "Nothing is awaiting approval" and
-- leaves the person with a button that cannot work. Those threads are left
-- alone; they rebuild on their own once the card is answered.
--
-- No notice message is written. "Your agent uses the new setup from here" is
-- agent-config copy, and this is a platform change nobody asked for and nobody
-- needs to read about.

update threads
set session_id = null
where session_id is not null
  and pending_tools is null;
