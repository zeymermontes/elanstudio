-- ============================================================================
-- ÉLANSTUDIO — public "images" storage bucket for coach/class/location photos.
-- Apply AFTER 0007_location_image.sql.
-- ============================================================================

-- Public bucket so the stored URLs render directly on the site.
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- Anyone can read; only admins can upload/replace/delete.
drop policy if exists "images_public_read" on storage.objects;
create policy "images_public_read" on storage.objects
  for select using (bucket_id = 'images');

drop policy if exists "images_admin_insert" on storage.objects;
create policy "images_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'images' and public.is_admin());

drop policy if exists "images_admin_update" on storage.objects;
create policy "images_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'images' and public.is_admin());

drop policy if exists "images_admin_delete" on storage.objects;
create policy "images_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'images' and public.is_admin());
