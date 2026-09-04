-- Enlaza el checkout a la cuenta con acceso (profile_id) y une duplicados por WhatsApp.

create or replace function public.normalize_whatsapp(p_whatsapp text)
returns text
language sql
immutable
as $$
  select case
    when d = '' then ''
    when d like '51%' and length(d) >= 11 then d
    when length(d) = 9 and d like '9%' then '51' || d
    else d
  end
  from (select regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g') as d) s;
$$;

-- Une clientes huérfanos (sin acceso) con la ficha que sí tiene login, mismo vendedor y mismo celular.
do $$
declare
  v_keep uuid;
  v_drop uuid;
begin
  loop
    select
      case
        when a.profile_id is not null and b.profile_id is null then a.id
        when b.profile_id is not null and a.profile_id is null then b.id
        else a.id
      end,
      case
        when a.profile_id is not null and b.profile_id is null then b.id
        when b.profile_id is not null and a.profile_id is null then a.id
        else b.id
      end
    into v_keep, v_drop
    from public.customers a
    join public.customers b
      on a.seller_id = b.seller_id
     and a.id < b.id
     and public.normalize_whatsapp(a.whatsapp) <> ''
     and public.normalize_whatsapp(a.whatsapp) = public.normalize_whatsapp(b.whatsapp)
    where not (a.profile_id is not null and b.profile_id is not null)
    limit 1;

    exit when v_keep is null;

    update public.orders set customer_id = v_keep where customer_id = v_drop;
    update public.services set customer_id = v_keep where customer_id = v_drop;
    update public.support_tickets set customer_id = v_keep where customer_id = v_drop;
    delete from public.customers where id = v_drop;
    v_keep := null;
    v_drop := null;
  end loop;
end $$;

update public.customers
set whatsapp = public.normalize_whatsapp(whatsapp)
where whatsapp is distinct from public.normalize_whatsapp(whatsapp)
  and public.normalize_whatsapp(whatsapp) <> '';

create or replace function public.place_order(
  p_seller_slug text,
  p_product_id uuid,
  p_name text,
  p_whatsapp text,
  p_email text,
  p_payment_method public.payment_method
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller public.sellers%rowtype;
  v_product public.products%rowtype;
  v_customer_id uuid;
  v_order_id uuid;
  v_code text;
  v_phone text;
  v_name text;
begin
  v_name := trim(p_name);
  v_phone := public.normalize_whatsapp(p_whatsapp);

  if length(v_name) < 2 or length(v_phone) < 9 then
    raise exception 'datos de cliente inválidos';
  end if;

  select * into v_seller from public.sellers where slug = p_seller_slug and status = 'active';
  if not found then
    raise exception 'vendedor no disponible';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
    and seller_id = v_seller.id
    and status = 'active';
  if not found then
    raise exception 'producto no disponible';
  end if;

  -- Si el cliente ya inició sesión, el pedido va a ESA ficha (no se crea otra).
  select id into v_customer_id
  from public.customers
  where seller_id = v_seller.id
    and profile_id = auth.uid();

  if v_customer_id is not null then
    update public.customers
    set
      name = v_name,
      email = coalesce(nullif(trim(p_email), ''), email),
      status = 'active',
      updated_at = now()
    where id = v_customer_id;
  else
    select id into v_customer_id
    from public.customers
    where seller_id = v_seller.id
      and public.normalize_whatsapp(whatsapp) = v_phone
    order by profile_id nulls last
    limit 1;

    if v_customer_id is not null then
      update public.customers
      set
        name = v_name,
        whatsapp = v_phone,
        email = coalesce(nullif(trim(p_email), ''), email),
        status = 'active',
        profile_id = coalesce(
          profile_id,
          case
            when exists (
              select 1 from public.profiles p
              where p.id = auth.uid() and p.role = 'customer'
            )
            and not exists (
              select 1 from public.customers c
              where c.profile_id = auth.uid()
            ) then auth.uid()
            else null
          end
        ),
        updated_at = now()
      where id = v_customer_id;
    else
      insert into public.customers (seller_id, name, whatsapp, email, status, profile_id)
      values (
        v_seller.id,
        v_name,
        v_phone,
        nullif(trim(p_email), ''),
        'active',
        case
          when exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'customer'
          )
          and not exists (
            select 1 from public.customers c
            where c.profile_id = auth.uid()
          ) then auth.uid()
          else null
        end
      )
      returning id into v_customer_id;
    end if;
  end if;

  v_code := 'PS-' || to_char(timezone('UTC', now()), 'YYYY') || '-' || lpad(nextval('public.order_code_seq')::text, 4, '0');

  insert into public.orders (
    code, seller_id, customer_id, product_id, amount, cost_price, duration_days,
    payment_method, payment_status, order_status
  ) values (
    v_code, v_seller.id, v_customer_id, v_product.id,
    v_product.sale_price, v_product.cost_price, v_product.duration_days,
    p_payment_method, 'submitted', 'pending_review'
  ) returning id into v_order_id;

  insert into public.order_items (order_id, product_id, quantity, sale_price, cost_price, duration_days)
  values (v_order_id, v_product.id, 1, v_product.sale_price, v_product.cost_price, v_product.duration_days);

  insert into public.audit_logs (actor_id, role, action, entity, entity_id, result)
  values (auth.uid(), coalesce(public.auth_role(), 'customer'), 'place_order', 'orders', v_order_id::text, v_code);

  return jsonb_build_object(
    'order_id', v_order_id,
    'code', v_code,
    'seller_id', v_seller.id,
    'amount', v_product.sale_price
  );
end;
$$;
