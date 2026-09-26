-- Registro de códigos que piden los vendedores (para saber quién pidió el último código
-- cuando Disney avisa que se cambió la clave o el correo de una cuenta).
create table if not exists public.seller_code_lookups (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.sellers (id) on delete cascade,
  platform_id uuid references public.platforms (id) on delete set null,
  email text not null,
  code text,
  created_at timestamptz not null default now()
);

create index if not exists seller_code_lookups_email_idx
  on public.seller_code_lookups (lower(email), created_at desc);

alter table public.seller_code_lookups enable row level security;

drop policy if exists seller_code_lookups_admin_read on public.seller_code_lookups;
create policy seller_code_lookups_admin_read on public.seller_code_lookups for select
using (public.is_superadmin());
