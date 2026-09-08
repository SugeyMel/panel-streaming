alter table public.seller_payment_methods
  add column if not exists logo_path text;
