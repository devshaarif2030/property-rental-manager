-- Maintenance request photos, kept in a private bucket.
--
-- Object names are <org_id>/<request_id>/<file_id>.<jpg|png|webp>. Storage
-- policies read the org and request from the path and defer to the
-- maintenance_requests RLS policy, so a photo is readable and uploadable by
-- exactly the people who can see its request: the tenant who reported it,
-- the org's managers and admins, and the staff member it is assigned to.
-- Files are served through short-lived signed URLs, never public links.
-- The app resizes photos in the browser, so 2 MB per file is plenty.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('request-photos', 'request-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

alter table public.request_photos
  add constraint request_photos_path_in_own_folder check (
    storage_path ~ ('^' || org_id::text || '/' || request_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
  );

create policy "upload photos to visible requests"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'request-photos'
    and (storage.foldername(name))[1] = (select private.current_org_id())::text
    and exists (
      select 1 from public.maintenance_requests r
      where r.org_id::text = (storage.foldername(name))[1]
        and r.id::text = (storage.foldername(name))[2]
    )
  );

create policy "read photos of visible requests"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'request-photos'
    and exists (
      select 1 from public.maintenance_requests r
      where r.org_id::text = (storage.foldername(name))[1]
        and r.id::text = (storage.foldername(name))[2]
    )
  );
