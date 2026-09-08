-- Plantillas de WhatsApp por vendedor. Sin seed: el fallback vive en src/lib/whatsapp.ts.

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  tipo text not null check (tipo in (
    'recordatorio_vencimiento',
    'oferta_renovacion',
    'entrega_pedido',
    'bienvenida'
  )),
  cuerpo text not null,
  cuerpo_vencido text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_templates_seller_id_tipo_key unique (seller_id, tipo),
  check (char_length(cuerpo) <= 1000),
  check (char_length(btrim(cuerpo)) > 0),
  check (cuerpo_vencido is null or char_length(cuerpo_vencido) <= 1000),
  check (cuerpo_vencido is null or char_length(btrim(cuerpo_vencido)) > 0)
);

create index if not exists message_templates_seller_idx
  on public.message_templates (seller_id);

drop trigger if exists message_templates_updated on public.message_templates;
create trigger message_templates_updated
before update on public.message_templates
for each row execute function public.touch_updated_at();

alter table public.message_templates enable row level security;

drop policy if exists message_templates_select on public.message_templates;
create policy message_templates_select on public.message_templates
for select
using (
  public.is_superadmin()
  or public.is_support()
  or seller_id = public.current_seller_id()
);

drop policy if exists message_templates_write on public.message_templates;
create policy message_templates_write on public.message_templates
for all
using (public.is_superadmin() or seller_id = public.current_seller_id())
with check (public.is_superadmin() or seller_id = public.current_seller_id());
