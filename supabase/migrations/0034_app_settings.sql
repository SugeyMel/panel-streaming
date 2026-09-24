-- Ajustes generales editables por el administrador (ej. WhatsApp de contacto para vendedores).
create table if not exists public.app_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

-- Solo el servidor (service role) lee y escribe esta tabla.
alter table public.app_settings enable row level security;
