-- Lease documents: one signed lease PDF per lease, kept in a private bucket.
--
-- Object names are <org_id>/<lease_id>/<file_id>.pdf. Storage policies read the
-- org and lease from the path, so:
--   admins and managers upload, read and remove documents for their org's leases
--   tenants read documents for their own leases
--   nobody else, and nothing across organizations
-- Files are served through short-lived signed URLs, never public links.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lease-documents', 'lease-documents', false, 5242880, array['application/pdf']);

-- A lease can only point at a file inside its own org and lease folder.
alter table public.leases
  add constraint leases_document_path_in_own_folder check (
    document_path is null
    or document_path ~ ('^' || org_id::text || '/' || id::text || '/[0-9a-f-]{36}\.pdf$')
  );

create policy "managers manage lease documents in their org"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'lease-documents'
    and (storage.foldername(name))[1] = (select private.managed_org_id())::text
  )
  with check (
    bucket_id = 'lease-documents'
    and (storage.foldername(name))[1] = (select private.managed_org_id())::text
    and exists (
      select 1 from public.leases l
      where l.org_id = (select private.managed_org_id())
        and l.id::text = (storage.foldername(name))[2]
    )
  );

create policy "tenants read documents of their own leases"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'lease-documents'
    and exists (
      select 1 from public.leases l
      where l.tenant_id = (select auth.uid())
        and l.org_id::text = (storage.foldername(name))[1]
        and l.id::text = (storage.foldername(name))[2]
    )
  );
