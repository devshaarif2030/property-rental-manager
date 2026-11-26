-- Local development seed: one fictional organization with one account per role.
-- Runs on `supabase db reset` and `supabase start`, never on the hosted project.
-- Every account uses the local-only password: demo-password
-- For the full sample portfolio, run: select private.reset_demo_data();

insert into public.organizations (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Sample Lettings Ltd');

create temporary table demo_users (id uuid, email text, full_name text, role public.user_role);

insert into demo_users (id, email, full_name, role) values
  ('10000000-0000-0000-0000-0000000000a1', 'admin@demo.test', 'Avery Admin', 'admin'),
  ('10000000-0000-0000-0000-0000000000a2', 'manager@demo.test', 'Morgan Manager', 'manager'),
  ('10000000-0000-0000-0000-0000000000a3', 'tenant@demo.test', 'Taylor Tenant', 'tenant'),
  ('10000000-0000-0000-0000-0000000000a4', 'staff@demo.test', 'Sam Staff', 'staff');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  extensions.crypt('demo-password', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb, jsonb_build_object('full_name', full_name),
  now(), now(), '', '', '', ''
from demo_users;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(), id, id::text, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  now(), now(), now()
from demo_users;

insert into public.profiles (id, org_id, role, full_name)
select id, '10000000-0000-0000-0000-000000000001', role, full_name
from demo_users;

-- Demo login buttons sign in as these accounts.
insert into private.demo_accounts (role, user_id) values
  ('manager', '10000000-0000-0000-0000-0000000000a2'),
  ('tenant', '10000000-0000-0000-0000-0000000000a3'),
  ('staff', '10000000-0000-0000-0000-0000000000a4');
