insert into storage.buckets (id, name, public)
values
  ('payment-receipts', 'payment-receipts', false),
  ('seller-qr', 'seller-qr', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy receipts_select_own
on storage.objects for select
using (
  bucket_id = 'payment-receipts'
  and (
    public.is_superadmin()
    or (storage.foldername(name))[1] = coalesce(public.current_seller_id()::text, '')
    or exists (
      select 1
      from public.orders o
      where o.customer_id = public.current_customer_id()
        and (storage.foldername(name))[2] = o.id::text
    )
  )
);

create policy receipts_insert_server_or_owner
on storage.objects for insert
with check (
  bucket_id = 'payment-receipts'
  and (
    public.is_superadmin()
    or (storage.foldername(name))[1] = coalesce(public.current_seller_id()::text, '')
    or (storage.foldername(name))[1] in (select id::text from public.sellers where status = 'active')
  )
);

create policy qr_public_read
on storage.objects for select
using (bucket_id = 'seller-qr');

create policy qr_seller_write
on storage.objects for insert
with check (
  bucket_id = 'seller-qr'
  and (
    public.is_superadmin()
    or (storage.foldername(name))[1] = coalesce(public.current_seller_id()::text, '')
  )
);

create policy qr_seller_update
on storage.objects for update
using (
  bucket_id = 'seller-qr'
  and (
    public.is_superadmin()
    or (storage.foldername(name))[1] = coalesce(public.current_seller_id()::text, '')
  )
);

create policy avatars_public_read
on storage.objects for select
using (bucket_id = 'avatars');

create policy avatars_own_write
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy avatars_own_update
on storage.objects for update
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
