-- Precio de 1 unidad vs precio por unidad al comprar un pack.
-- wholesale_price = precio bajo (el "Desde" de la tarjeta del vendedor).
-- unit_price = precio si alquila 1 sola unidad.

alter table public.supplier_products
  add column if not exists unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  add column if not exists bulk_qty integer not null default 3 check (bulk_qty >= 2);

comment on column public.supplier_products.unit_price is
  'Precio de 1 unidad para el vendedor. Si es 0, se usa wholesale_price.';
comment on column public.supplier_products.wholesale_price is
  'Precio por unidad al comprar bulk_qty unidades. Es el "Desde" de la tarjeta.';
comment on column public.supplier_products.bulk_qty is
  'Unidades del pack para el precio mayorista por unidad.';

drop policy if exists wholesale_sales_seller_insert on public.wholesale_sales;
create policy wholesale_sales_seller_insert on public.wholesale_sales
for insert
with check (
  seller_id = public.current_seller_id()
  and status = 'active'
);
