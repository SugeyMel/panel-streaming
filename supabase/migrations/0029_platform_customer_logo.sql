-- Logo cuadrado solo para Inicio del cliente (no reemplaza el de tienda ni el de mayorista).
alter table public.platforms
  add column if not exists customer_logo_path text;
