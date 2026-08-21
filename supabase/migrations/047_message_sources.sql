-- Where an answer came from, kept with the answer.
--
-- A web search hit has a title, a url, a snippet and sometimes a date. All of
-- it lived inside one tool call: we formatted it into text for the model and
-- discarded the structure, so the message kept the model's prose and nothing
-- else. Every honest source feature was blocked behind that.
--
-- The chip shipped before this can only reflect the LINKS the model chose to
-- write, which undercounts: in a real report Business Insider was named twice
-- in the prose with no link, so a "sources" count built from links would have
-- said two where a reader counts four. This column is what makes the count,
-- the titles, the snippets and the dates true rather than inferred.
--
-- JSONB ON THE MESSAGE, not a table of its own, and that is a deliberate
-- trade. Sources are only ever read alongside the message they belong to, and
-- nothing queries across them. The chat page was measured down to two round
-- trips and a join would make it three, which is a real cost paid to
-- normalise data no query wants normalised. Same shape and same reasoning as
-- `attachments` on this table.
--
-- Nullable with no default: null means "this message predates the column or
-- did no searching", and an empty array would claim we looked and found
-- nothing. The two are different and the UI treats them differently.
--
-- No index. There is no query that filters or sorts by this; it is read as
-- part of the row and never searched. An index here would be pure write cost.
--
-- RLS needs no change: `messages` already scopes every row through its
-- thread's owner, and a column inherits that.
alter table public.messages
  add column if not exists sources jsonb;

comment on column public.messages.sources is
  'Search hits behind this reply: [{url, title, snippet?, publishedAt?}]. Capped at 12 in application code. Null means the message predates the column or did no searching; an empty array would wrongly claim a search found nothing.';
