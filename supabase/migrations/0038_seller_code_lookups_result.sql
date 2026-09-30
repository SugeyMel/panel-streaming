-- Historial de códigos: guarda también el resultado de cada solicitud del vendedor
-- (FOUND = encontrado, NOT_FOUND = no había código, DENIED = denegado, RATE_LIMITED = demasiados intentos).
alter table public.seller_code_lookups
  add column if not exists result text not null default 'FOUND';

create index if not exists seller_code_lookups_created_idx
  on public.seller_code_lookups (created_at desc);

notify pgrst, 'reload schema';
