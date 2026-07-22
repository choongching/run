-- Admins can see all agents, including archived ones. Also required for the
-- archive soft-delete itself: Postgres enforces SELECT visibility on updated
-- rows, so setting is_active=false fails if no policy lets the admin see the
-- resulting row.

create policy "Admins can view all agents"
  on agents for select
  using (get_my_role() = 'admin');
