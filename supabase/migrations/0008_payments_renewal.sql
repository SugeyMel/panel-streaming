-- Medios de pago del vendedor (máx. 5) + renovación por producto + anulación

create table if not exists public.seller_payment_methods (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  kind text not null check (kind in ('yape', 'plin', 'bank')),
  holder_name text not null,
  account_number text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seller_payment_methods_seller_idx
  on public.seller_payment_methods (seller_id);

create or replace function public.enforce_max_payment_methods()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.seller_payment_methods where seller_id = new.seller_id) >= 5 then
    raise exception 'máximo 5 medios de pago';
  end if;
  return new;
end;
$$;

drop trigger if exists seller_payment_methods_max on public.seller_payment_methods;
create trigger seller_payment_methods_max
before insert on public.seller_payment_methods
for each row execute function public.enforce_max_payment_methods();

alter table public.seller_payment_methods enable row level security;

drop policy if exists spm_select on public.seller_payment_methods;
create policy spm_select on public.seller_payment_methods for select
using (
  public.is_superadmin()
  or public.is_support()
  or seller_id = public.current_seller_id()
  or seller_id in (select seller_id from public.customers where id = public.current_customer_id())
  or exists (select 1 from public.sellers s where s.id = seller_id and s.status = 'active')
);

drop policy if exists spm_write on public.seller_payment_methods;
create policy spm_write on public.seller_payment_methods for all
using (public.is_superadmin() or seller_id = public.current_seller_id())
with check (public.is_superadmin() or seller_id = public.current_seller_id());

alter table public.orders
  add column if not exists payment_method_id uuid references public.seller_payment_methods (id);

create or replace function public.decline_renewal(p_service_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.services
  set renewal_intent = 'decline',
      status = 'cancelled'
  where id = p_service_id
    and customer_id = public.current_customer_id();
  if not found then
    raise exception 'no autorizado';
  end if;
end;
$$;

drop function if exists public.renew_service(uuid, public.payment_method);

create or replace function public.renew_service(
  p_service_id uuid,
  p_product_id uuid,
  p_payment_method_id uuid
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
  v_pay public.seller_payment_methods%rowtype;
  v_order_id uuid;
  v_code text;
  v_method public.payment_method;
begin
  select * into v_service from public.services where id = p_service_id;
  if not found or v_service.customer_id is distinct from public.current_customer_id() then
    raise exception 'no autorizado';
  end if;

  select * into v_customer from public.customers where id = v_service.customer_id;
  select * into v_product from public.products
  where id = p_product_id and seller_id = v_service.seller_id and status = 'active';
  if not found then
    raise exception 'producto no disponible';
  end if;
  if v_product.platform_id is distinct from v_service.platform_id then
    raise exception 'el plan no corresponde a este servicio';
  end if;

  select * into v_seller from public.sellers where id = v_service.seller_id and status = 'active';
  if not found then
    raise exception 'vendedor no disponible';
  end if;

  select * into v_pay from public.seller_payment_methods
  where id = p_payment_method_id and seller_id = v_service.seller_id;
  if not found then
    raise exception 'medio de pago inválido';
  end if;

  v_method := case when v_pay.kind = 'plin' then 'plin'::public.payment_method else 'yape'::public.payment_method end;

  v_code := 'PS-' || to_char(timezone('UTC', now()), 'YYYY') || '-' || lpad(nextval('public.order_code_seq')::text, 4, '0');
  insert into public.orders (
    code, seller_id, customer_id, product_id, amount, cost_price, duration_days,
    payment_method, payment_status, order_status, payment_method_id
  ) values (
    v_code, v_seller.id, v_customer.id, v_product.id,
    v_product.sale_price, v_product.cost_price, v_product.duration_days,
    v_method, 'pending', 'pending_payment', v_pay.id
  ) returning id into v_order_id;

  insert into public.order_items (order_id, product_id, quantity, sale_price, cost_price, duration_days)
  values (v_order_id, v_product.id, 1, v_product.sale_price, v_product.cost_price, v_product.duration_days);

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
grant execute on function public.renew_service(uuid, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
