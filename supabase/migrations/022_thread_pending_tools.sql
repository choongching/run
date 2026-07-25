-- Revamp phase 3b: write actions ask first. When the agent calls a write tool
-- (e.g. gmail_create_draft), the run loop pauses at requires_action BEFORE
-- executing and stores the pending call(s) here while it shows an approval
-- card. The approve endpoint reads this, executes or denies, and resumes the
-- session. Null when nothing is awaiting approval.
alter table threads add column pending_tools jsonb;
