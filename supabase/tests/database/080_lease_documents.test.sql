-- Lease PDFs in the private lease-documents bucket: who can upload, read and
-- remove them, and where a lease's document_path may point.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(15);

-- Object names: <org_id>/<lease_id>/<file_id>.pdf
insert into storage.objects (bucket_id, name) values
  ('lease-documents',
   '00000000-0001-0000-0000-00000000000a/00000000-0005-0000-0000-0000000000a1/00000000-0013-0000-0000-0000000000a1.pdf'),
  ('lease-documents',
   '00000000-0001-0000-0000-00000000000b/00000000-0005-0000-0000-0000000000b1/00000000-0013-0000-0000-0000000000b1.pdf');

select results_eq(
  $$ select public from storage.buckets where id = 'lease-documents' $$,
  $$ values (false) $$,
  'the lease-documents bucket is private');

-- manager_a ------------------------------------------------------------------
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a1');

select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('lease-documents',
     '00000000-0001-0000-0000-00000000000a/00000000-0005-0000-0000-0000000000a2/00000000-0013-0000-0000-0000000000a2.pdf') $$,
  'manager uploads a document for an org lease');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('lease-documents',
     '00000000-0001-0000-0000-00000000000b/00000000-0005-0000-0000-0000000000b1/00000000-0013-0000-0000-0000000000b9.pdf') $$,
  '42501', null, 'manager cannot upload into another org''s folder');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('lease-documents',
     '00000000-0001-0000-0000-00000000000a/00000000-0005-0000-0000-0000000000b1/00000000-0013-0000-0000-0000000000a9.pdf') $$,
  '42501', null, 'manager cannot file a document under another org''s lease');
select results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'lease-documents' $$,
  $$ values (2) $$,
  'manager sees only their org''s lease documents');

select lives_ok(
  $$ update public.leases
     set document_path = '00000000-0001-0000-0000-00000000000a/00000000-0005-0000-0000-0000000000a2/00000000-0013-0000-0000-0000000000a2.pdf'
     where id = '00000000-0005-0000-0000-0000000000a2' $$,
  'manager links the uploaded document to its lease');
select throws_ok(
  $$ update public.leases
     set document_path = '00000000-0001-0000-0000-00000000000a/00000000-0005-0000-0000-0000000000a2/00000000-0013-0000-0000-0000000000a2.pdf'
     where id = '00000000-0005-0000-0000-0000000000a1' $$,
  '23514', null, 'a lease cannot point at a file in another lease''s folder');
select throws_ok(
  $$ update public.leases
     set document_path = '00000000-0001-0000-0000-00000000000a/00000000-0005-0000-0000-0000000000a1/../x.pdf'
     where id = '00000000-0005-0000-0000-0000000000a1' $$,
  '23514', null, 'a document path must be a plain file id');

-- tenant_a1 -----------------------------------------------------------------
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a2');

select results_eq(
  $$ select name from storage.objects where bucket_id = 'lease-documents' $$,
  $$ values ('00000000-0001-0000-0000-00000000000a/00000000-0005-0000-0000-0000000000a1/00000000-0013-0000-0000-0000000000a1.pdf') $$,
  'tenant sees only the document for their own lease');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('lease-documents',
     '00000000-0001-0000-0000-00000000000a/00000000-0005-0000-0000-0000000000a1/00000000-0013-0000-0000-0000000000a8.pdf') $$,
  '42501', null, 'tenant cannot upload lease documents');
delete from storage.objects where bucket_id = 'lease-documents';

-- staff_a1 and manager_b ----------------------------------------------------
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a4');
select is_empty(
  $$ select 1 from storage.objects where bucket_id = 'lease-documents' $$,
  'staff see no lease documents');

select tests.authenticate_as('00000000-0002-0000-0000-0000000000b1');
select results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'lease-documents' $$,
  $$ values (1) $$,
  'another org''s manager sees only their own org''s document');

select tests.clear_authentication();
select results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'lease-documents' $$,
  $$ values (3) $$,
  'a tenant''s delete removes nothing');

-- manager_a removes a document ---------------------------------------------
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a1');
delete from storage.objects
where name = '00000000-0001-0000-0000-00000000000a/00000000-0005-0000-0000-0000000000a1/00000000-0013-0000-0000-0000000000a1.pdf';
select tests.clear_authentication();
select results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'lease-documents' $$,
  $$ values (2) $$,
  'manager removes an org lease document');

select tests.authenticate_as_anon();
select is_empty(
  $$ select 1 from storage.objects where bucket_id = 'lease-documents' $$,
  'anon sees no lease documents');

select * from finish();
rollback;
