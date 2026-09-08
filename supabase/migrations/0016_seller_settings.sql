alter table public.sellers
  add column if not exists logo_path text,
  add column if not exists store_message text not null default '',
  add column if not exists notify_login_email boolean not null default true,
  add column if not exists notify_new_order boolean not null default true,
  add column if not exists notify_payment_review boolean not null default true,
  add column if not exists notify_service_expiring boolean not null default true,
  add column if not exists notify_inventory_expiring boolean not null default true;

alter table public.seller_payment_methods
  add column if not exists is_primary boolean not null default false,
  add column if not exists is_active boolean not null default true;

update public.seller_payment_methods
set is_primary = true
where id in (
  select distinct on (seller_id) id
  from public.seller_payment_methods
  order by seller_id, created_at
);

insert into storage.buckets (id, name, public)
values ('seller-logos', 'seller-logos', true)
on conflict (id) do nothing;

drop policy if exists seller_logos_public_read on storage.objects;
create policy seller_logos_public_read
on storage.objects for select
using (bucket_id = 'seller-logos');

drop policy if exists seller_logos_write on storage.objects;
create policy seller_logos_write
on storage.objects for insert
with check (
  bucket_id = 'seller-logos'
  and (
    public.is_superadmin()
    or (storage.foldername(name))[1] = coalesce(public.current_seller_id()::text, '')
  )
);

drop policy if exists seller_logos_update on storage.objects;
create policy seller_logos_update
on storage.objects for update
using (
  bucket_id = 'seller-logos'
  and (
    public.is_superadmin()
    or (storage.foldername(name))[1] = coalesce(public.current_seller_id()::text, '')
  )
);

drop policy if exists seller_logos_delete on storage.objects;
create policy seller_logos_delete
on storage.objects for delete
using (
  bucket_id = 'seller-logos'
  and (
    public.is_superadmin()
    or (storage.foldername(name))[1] = coalesce(public.current_seller_id()::text, '')
  )
);
