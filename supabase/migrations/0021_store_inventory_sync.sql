-- Banner público de tienda, ofertas, vínculo producto↔inventario y cuentas completas a revendedor.
-- No duplica productos ni cuentas: relaciona registros existentes.

alter table public.sellers
  add column if not exists store_banner_enabled boolean not null default true,
  add column if not exists store_banner_kicker text not null default '',
  add column if not exists store_banner_title text not null default '',
  add column if not exists store_banner_accent text not null default '',
  add column if not exists store_banner_description text not null default '',
  add column if not exists store_banner_path text;

alter table public.products
  add column if not exists compare_at_price numeric(12,2)
    check (compare_at_price is null or compare_at_price >= 0),
  add column if not exists on_offer boolean not null default false;

alter table public.streaming_accounts
  add column if not exists sale_kind text not null default 'profiles'
    check (sale_kind in ('profiles', 'full')),
  add column if not exists reseller_name text not null default '',
  add column if not exists reseller_whatsapp text not null default '';

create table if not exists public.store_offer_accounts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  platform_id uuid not null references public.platforms (id),
  product_name text not null,
  account_id uuid not null references public.streaming_accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint store_offer_accounts_account_unique unique (account_id)
);

create unique index if not exists store_offer_accounts_offer_account_idx
  on public.store_offer_accounts (seller_id, platform_id, lower(trim(product_name)), account_id);

alter table public.store_offer_accounts enable row level security;

drop policy if exists store_offer_accounts_select on public.store_offer_accounts;
create policy store_offer_accounts_select on public.store_offer_accounts for select
using (
  public.is_superadmin()
  or public.is_support()
  or seller_id = public.current_seller_id()
);

drop policy if exists store_offer_accounts_write on public.store_offer_accounts;
create policy store_offer_accounts_write on public.store_offer_accounts for all
using (public.is_superadmin() or seller_id = public.current_seller_id())
with check (public.is_superadmin() or seller_id = public.current_seller_id());

create or replace function public.offer_public_stock(
  p_seller_id uuid,
  p_platform_id uuid,
  p_name text,
  p_fallback integer
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with linked as (
    select
      a.id,
      a.max_profiles,
      a.sale_kind,
      a.status,
      a.reseller_whatsapp
    from public.store_offer_accounts l
    join public.streaming_accounts a on a.id = l.account_id
    where l.seller_id = p_seller_id
      and l.platform_id = p_platform_id
      and lower(trim(l.product_name)) = lower(trim(p_name))
      and a.status is distinct from 'inactive'
  )
  select case
    when not exists (select 1 from linked) then coalesce(p_fallback, 0)
    else coalesce((
      select sum(
        case
          when linked.sale_kind = 'full' then
            case
              when btrim(linked.reseller_whatsapp) <> '' or linked.status = 'full' then 0
              else 1
            end
          else greatest(
            0,
            linked.max_profiles - (
              select count(*)::integer
              from public.services s
              where s.account_id = linked.id
                and s.status is distinct from 'cancelled'
            )
          )
        end
      )
      from linked
    ), 0)
  end;
$$;

create or replace function public.get_storefront(p_seller_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_seller public.sellers%rowtype;
begin
  select * into v_seller
  from public.sellers
  where slug = p_seller_slug and status = 'active';
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'seller', jsonb_build_object(
      'id', v_seller.id,
      'name', v_seller.name,
      'businessName', v_seller.business_name,
      'slug', v_seller.slug,
      'whatsapp', v_seller.whatsapp,
      'yapeHolder', v_seller.yape_holder,
      'yapeNumber', v_seller.yape_number,
      'plinHolder', v_seller.plin_holder,
      'plinNumber', v_seller.plin_number,
      'qrYapePath', v_seller.qr_yape_path,
      'qrPlinPath', v_seller.qr_plin_path,
      'logoPath', v_seller.logo_path,
      'storeMessage', v_seller.store_message,
      'storeBannerEnabled', v_seller.store_banner_enabled,
      'storeBannerKicker', v_seller.store_banner_kicker,
      'storeBannerTitle', v_seller.store_banner_title,
      'storeBannerAccent', v_seller.store_banner_accent,
      'storeBannerDescription', v_seller.store_banner_description,
      'storeBannerPath', v_seller.store_banner_path
    ),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'platformId', p.platform_id,
        'name', p.name,
        'description', p.description,
        'salePrice', p.sale_price,
        'durationDays', p.duration_days,
        'stock', public.offer_public_stock(p.seller_id, p.platform_id, p.name, p.stock),
        'compareAtPrice', p.compare_at_price,
        'onOffer', p.on_offer,
        'inventoryLinked', exists (
          select 1
          from public.store_offer_accounts l
          where l.seller_id = p.seller_id
            and l.platform_id = p.platform_id
            and lower(trim(l.product_name)) = lower(trim(p.name))
        )
      ) order by p.name)
      from public.products p
      where p.seller_id = v_seller.id and p.status = 'active'
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.offer_public_stock(uuid, uuid, text, integer) to anon, authenticated;
grant execute on function public.get_storefront(text) to anon, authenticated;

notify pgrst, 'reload schema';
