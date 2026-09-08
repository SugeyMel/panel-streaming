alter table public.seller_payment_methods
  add column if not exists qr_path text;

drop policy if exists qr_seller_delete on storage.objects;
create policy qr_seller_delete
on storage.objects for delete
using (
  bucket_id = 'seller-qr'
  and (
    public.is_superadmin()
    or (storage.foldername(name))[1] = coalesce(public.current_seller_id()::text, '')
  )
);

notify pgrst, 'reload schema';
