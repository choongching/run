-- One in-progress attachment per thread, extracted to text at attach time and
-- inlined into the next message as reference material (not a persistent library).
alter table threads add column pending_attachment jsonb;

-- Metadata for files that rode along with a sent message, so a reload can
-- re-render the attachment chip in the user bubble (text is never stored here).
alter table messages add column attachments jsonb;
