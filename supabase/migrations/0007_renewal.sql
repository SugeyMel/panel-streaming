alter table public.services
  add column if not exists renewal_intent text not null default 'none';

alter table public.services
  drop constraint if exists services_renewal_intent_check;

alter table public.services
  add constraint services_renewal_intent_check
  check (renewal_intent in ('none', 'renew', 'decline'));

create or replace function public.decline_renewal(p_service_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.services
  set renewal_intent = 'decline'
  where id = p_service_id
    and customer_id = public.current_customer_id();
  if not found then
    raise exception 'no autorizado';
  end if;
end;
$$;

create or replace function public.renew_service(
  p_service_id uuid,
  p_payment_method public.payment_method
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services%rowtype;
  v_customer public.customers%rowtype;
  v_product public.products%rowtype;
  v_seller public.sellers%rowtype;
  v_order_id uuid;
  v_code text;
begin
  select * into v_service from public.services where id = p_service_id;
  if not found or v_service.customer_id is distinct from public.current_customer_id() then
    raise exception 'no autorizado';
  end if;

  select * into v_customer from public.customers where id = v_service.customer_id;
  select * into v_product from public.products where id = v_service.product_id and status = 'active';
  if not found then
    raise exception 'producto no disponible';
  end if;
  select * into v_seller from public.sellers where id = v_service.seller_id and status = 'active';
  if not found then
    raise exception 'vendedor no disponible';
  end if;

  select o.id, o.code into v_order_id, v_code
  from public.orders o
  where o.customer_id = v_service.customer_id
    and o.product_id = v_service.product_id
    and o.order_status in ('pending_payment', 'pending_review')
  order by o.created_at desc
  limit 1;

  if v_order_id is null then
    v_code := 'PS-' || to_char(timezone('UTC', now()), 'YYYY') || '-' || lpad(nextval('public.order_code_seq')::text, 4, '0');
    insert into public.orders (
      code, seller_id, customer_id, product_id, amount, cost_price, duration_days,
      payment_method, payment_status, order_status
    ) values (
      v_code, v_seller.id, v_customer.id, v_product.id,
      v_product.sale_price, v_product.cost_price, v_product.duration_days,
      p_payment_method, 'pending', 'pending_payment'
    ) returning id into v_order_id;

    insert into public.order_items (order_id, product_id, quantity, sale_price, cost_price, duration_days)
    values (v_order_id, v_product.id, 1, v_product.sale_price, v_product.cost_price, v_product.duration_days);
  else
    update public.orders
    set payment_method = p_payment_method
    where id = v_order_id;
  end if;

  update public.services set renewal_intent = 'renew' where id = p_service_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'code', v_code,
    'seller_id', v_seller.id,
    'amount', v_product.sale_price
  );
end;
$$;

grant execute on function public.decline_renewal(uuid) to authenticated;
grant execute on function public.renew_service(uuid, public.payment_method) to authenticated;
