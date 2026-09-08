alter table public.streaming_accounts
  add column if not exists supplier_expires_at date;
