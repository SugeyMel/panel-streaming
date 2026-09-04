-- Panel Streaming — schema inicial
create extension if not exists pgcrypto;

create type public.app_role as enum ('superadmin', 'seller', 'customer', 'support');
create type public.seller_status as enum ('active', 'suspended', 'pending', 'disabled');
create type public.customer_status as enum ('active', 'inactive', 'suspended');
create type public.product_status as enum ('active', 'inactive', 'sold_out');
create type public.service_status as enum ('active', 'expiring', 'expired', 'suspended', 'cancelled');
create type public.order_status as enum (
  'pending_payment',
  'pending_review',
  'approved',
  'rejected',
  'cancelled',
  'delivered'
);
create type public.payment_status as enum ('pending', 'submitted', 'paid', 'rejected');
create type public.payment_method as enum ('yape', 'plin');
create type public.ticket_status as enum ('pending', 'in_progress', 'answered', 'closed');
create type public.supplier_status as enum ('active', 'inactive');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'customer',
  full_name text not null default '',
  email text not null,
  whatsapp text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sellers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  name text not null,
  business_name text not null,
  slug text not null unique,
  email text not null,
  whatsapp text not null default '',
  status public.seller_status not null default 'pending',
  yape_holder text not null default '',
  yape_number text not null default '',
  plin_holder text not null default '',
  plin_number text not null default '',
  qr_yape_path text,
  qr_plin_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  name text not null,
  whatsapp text not null,
  email text,
  status public.customer_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, whatsapp)
);

create table public.platforms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text not null default '',
  available boolean not null default true,
  accent_from text not null default '#1e1b4b',
  accent_to text not null default '#22d3ee',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  platform_id uuid not null references public.platforms (id),
  name text not null,
  description text not null default '',
  cost_price numeric(12,2) not null check (cost_price >= 0),
  sale_price numeric(12,2) not null check (sale_price >= 0),
  duration_days integer not null default 30 check (duration_days > 0),
  status public.product_status not null default 'active',
  stock integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  seller_id uuid not null references public.sellers (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  product_id uuid not null references public.products (id),
  amount numeric(12,2) not null check (amount >= 0),
  cost_price numeric(12,2) not null check (cost_price >= 0),
  duration_days integer not null,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending',
  order_status public.order_status not null default 'pending_payment',
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  quantity integer not null default 1 check (quantity > 0),
  sale_price numeric(12,2) not null,
  cost_price numeric(12,2) not null,
  duration_days integer not null
);

create table public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  seller_id uuid not null references public.sellers (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  product_id uuid not null references public.products (id),
  platform_id uuid not null references public.platforms (id),
  order_id uuid unique references public.orders (id),
  start_date date not null,
  end_date date not null,
  cost_price numeric(12,2) not null,
  sale_price numeric(12,2) not null,
  status public.service_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  description text not null,
  occurred_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  status public.supplier_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  platform_id uuid references public.platforms (id),
  name text not null,
  wholesale_price numeric(12,2) not null check (wholesale_price >= 0),
  status public.supplier_status not null default 'active',
  notes text,
  created_at timestamptz not null default now()
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  created_by uuid references public.profiles (id),
  audience text not null default 'seller' check (audience in ('seller', 'admin')),
  subject text not null,
  message text not null,
  status public.ticket_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  role public.app_role,
  action text not null,
  entity text not null,
  entity_id text,
  result text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index sellers_status_idx on public.sellers (status);
create index customers_seller_idx on public.customers (seller_id);
create index customers_profile_idx on public.customers (profile_id);
create index products_seller_idx on public.products (seller_id);
create index products_platform_idx on public.products (platform_id);
create index orders_seller_idx on public.orders (seller_id);
create index orders_customer_idx on public.orders (customer_id);
create index orders_status_idx on public.orders (order_status, payment_status);
create index services_seller_idx on public.services (seller_id);
create index services_customer_idx on public.services (customer_id);
create index services_end_date_idx on public.services (end_date);
create index expenses_seller_idx on public.expenses (seller_id, occurred_at);
create index tickets_seller_idx on public.support_tickets (seller_id);
create index receipts_seller_idx on public.payment_receipts (seller_id);
create index audit_created_idx on public.audit_logs (created_at desc);

create sequence public.order_code_seq;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger sellers_updated before update on public.sellers
for each row execute function public.touch_updated_at();
create trigger customers_updated before update on public.customers
for each row execute function public.touch_updated_at();
create trigger platforms_updated before update on public.platforms
for each row execute function public.touch_updated_at();
create trigger products_updated before update on public.products
for each row execute function public.touch_updated_at();
create trigger orders_updated before update on public.orders
for each row execute function public.touch_updated_at();
create trigger services_updated before update on public.services
for each row execute function public.touch_updated_at();
create trigger suppliers_updated before update on public.suppliers
for each row execute function public.touch_updated_at();
create trigger tickets_updated before update on public.support_tickets
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'customer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
