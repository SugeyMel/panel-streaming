-- Tokens OAuth del buzón. El vendedor no puede leer esta tabla (solo service role).
-- No guarda contraseñas de correo ni el cuerpo de los mensajes.

alter table public.connected_emails
  add column if not exists oauth_email text;

create table if not exists public.email_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  connected_email_id uuid not null unique references public.connected_emails (id) on delete cascade,
  seller_id uuid not null references public.sellers (id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  oauth_email text not null default '',
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_oauth_tokens_seller_idx
  on public.email_oauth_tokens (seller_id);

alter table public.email_oauth_tokens enable row level security;

drop policy if exists email_oauth_tokens_deny_all on public.email_oauth_tokens;
-- Sin policies de SELECT/INSERT para authenticated: nadie accede por JWT.
-- El servidor usa service role, que bypasea RLS.

notify pgrst, 'reload schema';
