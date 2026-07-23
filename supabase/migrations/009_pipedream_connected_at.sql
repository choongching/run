-- When the org Drive connection was made (from Pipedream's account record),
-- shown as connection metadata in the integrations UI.
alter table company_settings
  add column pipedream_connected_at timestamptz;
