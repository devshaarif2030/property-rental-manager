-- Structural guards: RLS is on for every public table, every business table
-- carries org_id, and anon has no table access.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select is_empty(
  $$
    select c.relname::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  $$,
  'every public table has RLS enabled'
);

select is_empty(
  $$
    select c.relname::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname <> 'organizations'
      and not exists (
        select 1 from pg_attribute a
        where a.attrelid = c.oid and a.attname = 'org_id' and not a.attisdropped
      )
  $$,
  'every business table has an org_id column'
);

select is_empty(
  $$
    select table_name::text
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
  $$,
  'anon has no privileges on any public table'
);

select is_empty(
  $$
    select table_name::text
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
      and table_name in ('rent_charges', 'payments', 'notifications', 'audit_log')
    union
    select table_name::text
    from information_schema.column_privileges
    where table_schema = 'public'
      and grantee = 'authenticated'
      and privilege_type in ('INSERT')
      and table_name in ('rent_charges', 'payments', 'notifications', 'audit_log')
  $$,
  'clients cannot write rent charges, payments, notifications or the audit log'
);

select * from finish();
rollback;
