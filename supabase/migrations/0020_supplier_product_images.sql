alter table public.supplier_products
  add column if not exists image_path text;

insert into storage.buckets (id, name, public)
values ('supplier-product-images', 'supplier-product-images', true)
on conflict (id) do nothing;

drop policy if exists supplier_product_images_public_read on storage.objects;
create policy supplier_product_images_public_read
on storage.objects for select
using (bucket_id = 'supplier-product-images');

drop policy if exists supplier_product_images_admin_insert on storage.objects;
create policy supplier_product_images_admin_insert
on storage.objects for insert
with check (
  bucket_id = 'supplier-product-images'
  and public.is_superadmin()
);

drop policy if exists supplier_product_images_admin_update on storage.objects;
create policy supplier_product_images_admin_update
on storage.objects for update
using (
  bucket_id = 'supplier-product-images'
  and public.is_superadmin()
);

drop policy if exists supplier_product_images_admin_delete on storage.objects;
create policy supplier_product_images_admin_delete
on storage.objects for delete
using (
  bucket_id = 'supplier-product-images'
  and public.is_superadmin()
);
