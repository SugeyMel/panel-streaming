-- Cuentas asignadas por el administrador a un vendedor ("Mis cuentas" del panel vendedor).
alter table public.streaming_accounts
  add column if not exists assigned_by_admin boolean not null default false,
  add column if not exists assigned_at timestamptz;

create index if not exists streaming_accounts_assigned_idx
  on public.streaming_accounts (seller_id)
  where assigned_by_admin;
