-- Cuentas asignadas por la administradora a un cliente directo ("Venta directa").
-- Guarda a qué cliente se le dio la cuenta para mostrar su nombre en "Cuentas asignadas".
alter table public.streaming_accounts
  add column if not exists customer_id uuid references public.customers (id) on delete set null;

create index if not exists streaming_accounts_customer_idx
  on public.streaming_accounts (customer_id)
  where customer_id is not null;

notify pgrst, 'reload schema';
