alter table public.platforms
  add column if not exists logo_path text;

insert into storage.buckets (id, name, public)
values ('platform-logos', 'platform-logos', true)
on conflict (id) do nothing;

drop policy if exists platform_logos_public_read on storage.objects;
create policy platform_logos_public_read
on storage.objects for select
using (bucket_id = 'platform-logos');

drop policy if exists platform_logos_admin_insert on storage.objects;
create policy platform_logos_admin_insert
on storage.objects for insert
with check (
  bucket_id = 'platform-logos'
  and public.is_superadmin()
);

drop policy if exists platform_logos_admin_update on storage.objects;
create policy platform_logos_admin_update
on storage.objects for update
using (
  bucket_id = 'platform-logos'
  and public.is_superadmin()
);

drop policy if exists platform_logos_admin_delete on storage.objects;
create policy platform_logos_admin_delete
on storage.objects for delete
using (
  bucket_id = 'platform-logos'
  and public.is_superadmin()
);
