-- Imágenes del Inicio por vendedor. Archivos en bucket seller-logos: {sellerId}/home/{slot}.{ext}

create table if not exists public.home_images (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  slot text not null check (slot in (
    'hero',
    'tienda',
    'clientes',
    'correos',
    'inventario',
    'pagos',
    'pedidos',
    'reportes',
    'configuracion'
  )),
  storage_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint home_images_seller_id_slot_key unique (seller_id, slot)
);

create index if not exists home_images_seller_idx
  on public.home_images (seller_id);

drop trigger if exists home_images_updated on public.home_images;
create trigger home_images_updated
before update on public.home_images
for each row execute function public.touch_updated_at();

alter table public.home_images enable row level security;

drop policy if exists home_images_select on public.home_images;
create policy home_images_select on public.home_images
for select
using (
  public.is_superadmin()
  or public.is_support()
  or seller_id = public.current_seller_id()
);

drop policy if exists home_images_write on public.home_images;
create policy home_images_write on public.home_images
for all
using (public.is_superadmin() or seller_id = public.current_seller_id())
with check (public.is_superadmin() or seller_id = public.current_seller_id());
