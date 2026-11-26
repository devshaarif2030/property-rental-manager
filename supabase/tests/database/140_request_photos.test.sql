-- Request photos in the private request-photos bucket: the people who can see
-- a request can upload and read its photos, nobody else can, and a photo row
-- can only point inside its own request's folder.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(12);

-- Object names: <org_id>/<request_id>/<file_id>.<ext>
insert into storage.objects (bucket_id, name) values
  ('request-photos', '00000000-0001-0000-0000-00000000000a/00000000-0008-0000-0000-0000000000a1/00000000-0014-0000-0000-0000000000a1.jpg'),
  ('request-photos', '00000000-0001-0000-0000-00000000000a/00000000-0008-0000-0000-0000000000a2/00000000-0014-0000-0000-0000000000a2.jpg'),
  ('request-photos', '00000000-0001-0000-0000-00000000000b/00000000-0008-0000-0000-0000000000b1/00000000-0014-0000-0000-0000000000b1.jpg');

select results_eq(
  $$ select public, file_size_limit from storage.buckets where id = 'request-photos' $$,
  $$ values (false, 2097152::bigint) $$,
  'the request-photos bucket is private and capped at 2 MB');

-- tenant_a1 reported request a1 ------------------------------------------------
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a2');
select results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'request-photos' $$,
  $$ values (1) $$,
  'tenant sees only photos of their own request');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('request-photos',
     '00000000-0001-0000-0000-00000000000a/00000000-0008-0000-0000-0000000000a1/00000000-0014-0000-0000-0000000000a3.jpg') $$,
  'tenant uploads a photo to their own request');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('request-photos',
     '00000000-0001-0000-0000-00000000000a/00000000-0008-0000-0000-0000000000a2/00000000-0014-0000-0000-0000000000a4.jpg') $$,
  '42501', null, 'tenant cannot upload to another tenant''s request');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('request-photos',
     '00000000-0001-0000-0000-00000000000b/00000000-0008-0000-0000-0000000000b1/00000000-0014-0000-0000-0000000000a5.jpg') $$,
  '42501', null, 'tenant cannot upload into another org');
select lives_ok(
  $$ insert into public.request_photos (org_id, request_id, storage_path, uploaded_by)
     values ('00000000-0001-0000-0000-00000000000a', '00000000-0008-0000-0000-0000000000a1',
             '00000000-0001-0000-0000-00000000000a/00000000-0008-0000-0000-0000000000a1/00000000-0014-0000-0000-0000000000a3.jpg',
             '00000000-0002-0000-0000-0000000000a2') $$,
  'tenant records the photo on their request');
select tests.clear_authentication();

select throws_ok(
  $$ insert into public.request_photos (org_id, request_id, storage_path, uploaded_by)
     values ('00000000-0001-0000-0000-00000000000a', '00000000-0008-0000-0000-0000000000a1',
             '00000000-0001-0000-0000-00000000000a/00000000-0008-0000-0000-0000000000a2/00000000-0014-0000-0000-0000000000a6.jpg',
             '00000000-0002-0000-0000-0000000000a2') $$,
  '23514', null, 'a photo row cannot point into another request''s folder');
select throws_ok(
  $$ insert into public.request_photos (org_id, request_id, storage_path, uploaded_by)
     values ('00000000-0001-0000-0000-00000000000a', '00000000-0008-0000-0000-0000000000a1',
             '00000000-0001-0000-0000-00000000000a/00000000-0008-0000-0000-0000000000a1/x.gif',
             '00000000-0002-0000-0000-0000000000a2') $$,
  '23514', null, 'a photo path must be a file id with an image extension');

-- staff_a1 is assigned request a1 ---------------------------------------------
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a4');
select results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'request-photos' $$,
  $$ values (2) $$,
  'staff see photos of their assigned job only');
select tests.clear_authentication();

-- manager_a ----------------------------------------------------------------------
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a1');
select results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'request-photos' $$,
  $$ values (3) $$,
  'manager sees photos of every org request, not other orgs');
select tests.clear_authentication();

-- manager_b ----------------------------------------------------------------------
select tests.authenticate_as('00000000-0002-0000-0000-0000000000b1');
select results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'request-photos' $$,
  $$ values (1) $$,
  'another org''s manager sees only their own');
select tests.clear_authentication();

select tests.authenticate_as_anon();
select is_empty(
  $$ select name from storage.objects where bucket_id = 'request-photos' $$,
  'signed-out visitors see nothing');
select tests.clear_authentication();

select * from finish();
rollback;
