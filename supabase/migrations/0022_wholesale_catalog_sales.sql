-- Catálogo mayorista (lo que ofrezco) + entradas de stock + ventas a vendedores.
-- No toca services / products de la tienda del vendedor.

create type public.wholesale_offer_kind as enum ('perfil', 'cuenta_completa');
create type public.wholesale_sale_status as enum ('active', 'cancelled');

alter table public.supplier_products
  alter column supplier_id drop not null;

alter table public.supplier_products
  drop constraint if exists supplier_products_supplier_id_fkey;

alter table public.supplier_products
  add constraint supplier_products_supplier_id_fkey
  foreign key (supplier_id) references public.suppliers (id) on delete set null;

alter table public.supplier_products
  add column if not exists description text not null default '',
  add column if not exists cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  add column if not exists offer_kind public.wholesale_offer_kind not null default 'perfil',
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists supplier_products_updated on public.supplier_products;
create trigger supplier_products_updated
before update on public.supplier_products
for each row execute function public.touch_updated_at();

create table public.wholesale_stock_entries (
  id uuid primary key default gen_random_uuid(),
  supplier_product_id uuid not null references public.supplier_products (id) on delete restrict,
  supplier_id uuid references public.suppliers (id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,2) check (unit_cost is null or unit_cost >= 0),
  received_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index wholesale_stock_entries_product_idx
  on public.wholesale_stock_entries (supplier_product_id);

create table public.wholesale_sales (
  id uuid primary key default gen_random_uuid(),
  supplier_product_id uuid not null references public.supplier_products (id) on delete restrict,
  seller_id uuid not null references public.sellers (id) on delete restrict,
  platform_id uuid references public.platforms (id),
  offer_kind public.wholesale_offer_kind not null,
  quantity integer not null default 1 check (quantity > 0),
  cost_price numeric(12,2) not null check (cost_price >= 0),
  wholesale_price numeric(12,2) not null check (wholesale_price >= 0),
  purchased_at date not null default current_date,
  expires_at date not null,
  status public.wholesale_sale_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index wholesale_sales_product_idx on public.wholesale_sales (supplier_product_id);
create index wholesale_sales_seller_idx on public.wholesale_sales (seller_id);
create index wholesale_sales_expires_idx on public.wholesale_sales (expires_at);
create index wholesale_sales_status_idx on public.wholesale_sales (status);

drop trigger if exists wholesale_sales_updated on public.wholesale_sales;
create trigger wholesale_sales_updated
before update on public.wholesale_sales
for each row execute function public.touch_updated_at();

create or replace view public.wholesale_product_stock
with (security_invoker = true)
as
select
  p.id as supplier_product_id,
  coalesce((
    select sum(e.quantity)::integer
    from public.wholesale_stock_entries e
    where e.supplier_product_id = p.id
  ), 0) as acquired,
  coalesce((
    select sum(s.quantity)::integer
    from public.wholesale_sales s
    where s.supplier_product_id = p.id
      and s.status = 'active'
  ), 0) as sold,
  coalesce((
    select sum(e.quantity)::integer
    from public.wholesale_stock_entries e
    where e.supplier_product_id = p.id
  ), 0)
  - coalesce((
    select sum(s.quantity)::integer
    from public.wholesale_sales s
    where s.supplier_product_id = p.id
      and s.status = 'active'
  ), 0) as available
from public.supplier_products p;

create or replace function public.wholesale_assert_stock()
returns trigger
language plpgsql
as $$
declare
  v_available integer;
  v_old integer := 0;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.status is distinct from 'active' then
    return new;
  end if;

  select available into v_available
  from public.wholesale_product_stock
  where supplier_product_id = new.supplier_product_id;

  if tg_op = 'UPDATE' and old.status = 'active' and old.supplier_product_id = new.supplier_product_id then
    v_old := old.quantity;
  end if;

  if coalesce(v_available, 0) + v_old < new.quantity then
    raise exception 'sin stock suficiente para este producto mayorista';
  end if;

  return new;
end;
$$;

drop trigger if exists wholesale_sales_assert_stock on public.wholesale_sales;
create trigger wholesale_sales_assert_stock
before insert or update on public.wholesale_sales
for each row execute function public.wholesale_assert_stock();

alter table public.wholesale_stock_entries enable row level security;
alter table public.wholesale_sales enable row level security;

create policy wholesale_stock_entries_admin on public.wholesale_stock_entries for all
using (public.is_superadmin())
with check (public.is_superadmin());

create policy wholesale_sales_admin on public.wholesale_sales for all
using (public.is_superadmin())
with check (public.is_superadmin());

create policy wholesale_sales_seller_read on public.wholesale_sales for select
using (seller_id = public.current_seller_id());
