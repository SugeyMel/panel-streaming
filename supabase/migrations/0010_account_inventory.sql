create table if not exists public.streaming_accounts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  platform_id uuid not null references public.platforms (id),
  email text not null,
  password text not null default '',
  label text not null default '',
  max_profiles integer not null default 5 check (max_profiles between 1 and 8),
  status text not null default 'available' check (status in ('available', 'full', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists streaming_accounts_unique_email
  on public.streaming_accounts (seller_id, platform_id, lower(email));

alter table public.services
  add column if not exists account_id uuid references public.streaming_accounts (id) on delete set null;

alter table public.streaming_accounts enable row level security;

drop policy if exists streaming_accounts_select on public.streaming_accounts;
create policy streaming_accounts_select on public.streaming_accounts for select
using (
  public.is_superadmin()
  or public.is_support()
  or seller_id = public.current_seller_id()
);

drop policy if exists streaming_accounts_write on public.streaming_accounts;
create policy streaming_accounts_write on public.streaming_accounts for all
using (public.is_superadmin() or seller_id = public.current_seller_id())
with check (public.is_superadmin() or seller_id = public.current_seller_id());

notify pgrst, 'reload schema';
