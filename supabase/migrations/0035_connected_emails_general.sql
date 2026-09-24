-- Buzones generales del administrador: sin vendedor asignado (sirven a todos los vendedores).
alter table public.connected_emails alter column seller_id drop not null;
alter table public.email_oauth_tokens alter column seller_id drop not null;

-- Evita duplicar el mismo correo como buzón general.
create unique index if not exists connected_emails_general_email_idx
  on public.connected_emails (lower(email))
  where seller_id is null;

notify pgrst, 'reload schema';
