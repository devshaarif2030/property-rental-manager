-- The server's service-role client (invite lookup, sign up, pending payments)
-- needs plain table access. Local Supabase grants it by default, but hosted
-- projects can be created without those default grants, so the live invite
-- page failed with "permission denied for table invites". Grant it here so
-- every environment matches. service_role is server only and bypasses RLS.

revoke all on all tables in schema public from service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to service_role;
