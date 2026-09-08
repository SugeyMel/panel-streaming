alter table public.streaming_accounts
  add column if not exists expires_at date,
  add column if not exists supplier_name text not null default '',
  add column if not exists supplier_contact text not null default '',
  add column if not exists supplier_cost numeric(12,2) not null default 0,
  add column if not exists supplier_note text not null default '';
