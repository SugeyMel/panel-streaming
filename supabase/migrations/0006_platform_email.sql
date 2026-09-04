-- Correo/cuenta de la plataforma asignada al servicio (Gmail, etc.)
alter table public.services
  add column if not exists platform_email text;

comment on column public.services.platform_email is
  'Correo o usuario de la cuenta del servicio (Netflix, Max, etc.). No es el login del panel.';
