-- The service role can read and write every public table, whatever grants the
-- hosted project started with.
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

select is_empty(
  $$ select c.relname from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and not (has_table_privilege('service_role', c.oid, 'SELECT')
            and has_table_privilege('service_role', c.oid, 'INSERT')
            and has_table_privilege('service_role', c.oid, 'UPDATE')
            and has_table_privilege('service_role', c.oid, 'DELETE')) $$,
  'service_role can select, insert, update and delete on every public table');

select ok(
  not has_table_privilege('anon', 'public.invites', 'SELECT'),
  'anon still has no access to invites');

select * from finish();
rollback;
