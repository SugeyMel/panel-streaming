-- Buzones para códigos de acceso de clientes + filtros deny-by-default.
-- No guarda contraseñas de correo ni el cuerpo de los mensajes.

create table if not exists public.connected_emails (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  email text not null,
  provider text not null default 'google' check (provider in ('google', 'microsoft')),
  status text not null default 'registrado'
    check (status in ('registrado', 'conectado', 'requiere_reconexion', 'desconectado', 'error')),
  codes_enabled boolean not null default true,
  linked_platform_ids text[] not null default '{}',
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists connected_emails_seller_email_idx
  on public.connected_emails (seller_id, lower(email));

create table if not exists public.email_code_filters (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid unique references public.sellers (id) on delete cascade,
  allow_login_code boolean not null default true,
  allow_verification_code boolean not null default true,
  allow_netflix_travel boolean not null default true,
  allow_netflix_household boolean not null default false,
  extra_block_keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists email_code_filters_global_idx
  on public.email_code_filters ((true))
  where seller_id is null;

create table if not exists public.email_code_lookups (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  platform_id uuid references public.platforms (id),
  connected_email_id uuid references public.connected_emails (id) on delete set null,
  result text not null,
  lookup_type text not null default 'UNKNOWN_BLOCKED',
  created_at timestamptz not null default now()
);

create index if not exists email_code_lookups_rate_idx
  on public.email_code_lookups (customer_id, service_id, created_at desc);

alter table public.connected_emails enable row level security;
alter table public.email_code_filters enable row level security;
alter table public.email_code_lookups enable row level security;

drop policy if exists connected_emails_select on public.connected_emails;
create policy connected_emails_select on public.connected_emails for select
using (
  public.is_superadmin()
  or public.is_support()
  or seller_id = public.current_seller_id()
);

drop policy if exists connected_emails_write on public.connected_emails;
create policy connected_emails_write on public.connected_emails for all
using (public.is_superadmin() or seller_id = public.current_seller_id())
with check (public.is_superadmin() or seller_id = public.current_seller_id());

drop policy if exists email_code_filters_select on public.email_code_filters;
create policy email_code_filters_select on public.email_code_filters for select
using (
  public.is_superadmin()
  or public.is_support()
  or seller_id is null
  or seller_id = public.current_seller_id()
);

drop policy if exists email_code_filters_write on public.email_code_filters;
create policy email_code_filters_write on public.email_code_filters for all
using (
  public.is_superadmin()
  or (seller_id = public.current_seller_id())
)
with check (
  public.is_superadmin()
  or (seller_id = public.current_seller_id())
);

drop policy if exists email_code_lookups_select on public.email_code_lookups;
create policy email_code_lookups_select on public.email_code_lookups for select
using (
  public.is_superadmin()
  or public.is_support()
  or seller_id = public.current_seller_id()
);

drop policy if exists email_code_lookups_insert on public.email_code_lookups;
create policy email_code_lookups_insert on public.email_code_lookups for insert
with check (
  public.is_superadmin()
  or customer_id = public.current_customer_id()
);

notify pgrst, 'reload schema';
