-- Evitar que clientes/anónimos lean cost_price

drop policy if exists products_select on public.products;

create policy products_select on public.products for select
using (
  public.is_superadmin()
  or public.is_support()
  or seller_id = public.current_seller_id()
);

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
      'qrPlinPath', v_seller.qr_plin_path
    ),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'platformId', p.platform_id,
        'name', p.name,
        'description', p.description,
        'salePrice', p.sale_price,
        'durationDays', p.duration_days,
        'stock', p.stock
      ) order by p.name)
      from public.products p
      where p.seller_id = v_seller.id and p.status = 'active'
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_storefront(text) to anon, authenticated;
