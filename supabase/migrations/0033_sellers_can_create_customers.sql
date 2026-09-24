-- El administrador decide si un vendedor puede crear clientes (activado por defecto).
alter table public.sellers
  add column if not exists can_create_customers boolean not null default true;
