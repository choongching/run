create extension if not exists "uuid-ossp";

create type user_role as enum ('admin', 'user');

create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  role          user_role not null default 'user',
  display_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

create or replace function get_my_role()
returns user_role language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;

alter table profiles enable row level security;

create policy "Users can view all profiles"
  on profiles for select to authenticated using (true);

create policy "Users can update their own profile"
  on profiles for update using (id = auth.uid());

create policy "Admins can update any profile"
  on profiles for update using (get_my_role() = 'admin');

create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into profiles (id, role, display_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'user'),
    new.raw_user_meta_data->>'display_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
