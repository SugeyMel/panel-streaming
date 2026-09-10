alter table public.supplier_products
  add column if not exists sort_order integer not null default 0;

comment on column public.supplier_products.sort_order is
  'Orden de aparición en el catálogo mayorista del vendedor.';
