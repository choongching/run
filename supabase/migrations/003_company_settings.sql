-- Singleton company context store; injected into AI prompt generation and,
-- later, mission runs. Admins manage it; all authenticated users can read it.

create table company_settings (
  id              uuid primary key default gen_random_uuid(),
  company_context text,
  updated_at      timestamptz not null default now()
);

alter table company_settings enable row level security;

create policy "Admins manage company settings"
  on company_settings for all
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "All users can view company settings"
  on company_settings for select
  to authenticated using (true);

create trigger company_settings_updated_at
  before update on company_settings
  for each row execute procedure update_updated_at_column();

-- Seed the singleton row
insert into company_settings (company_context) values (null);
