-- Helpers + RLS + RPCs de negocio

create or replace function public.auth_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_role() = 'superadmin', false);
$$;

create or replace function public.is_support()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_role() = 'support', false);
$$;

create or replace function public.current_seller_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.sellers where profile_id = auth.uid() limit 1;
$$;

create or replace function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.customers where profile_id = auth.uid() limit 1;
$$;

create or replace function public.owns_seller(p_seller_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_seller_id is not null and p_seller_id = public.current_seller_id();
$$;

grant execute on function public.auth_role() to authenticated, anon;
grant execute on function public.is_superadmin() to authenticated, anon;
grant execute on function public.is_support() to authenticated, anon;
grant execute on function public.current_seller_id() to authenticated, anon;
grant execute on function public.current_customer_id() to authenticated, anon;
grant execute on function public.owns_seller(uuid) to authenticated, anon;

alter table public.profiles enable row level security;
alter table public.sellers enable row level security;
alter table public.customers enable row level security;
alter table public.platforms enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_receipts enable row level security;
alter table public.services enable row level security;
alter table public.expenses enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_products enable row level security;
alter table public.support_tickets enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
create policy profiles_select on public.profiles for select
using (
  id = auth.uid()
  or public.is_superadmin()
  or public.is_support()
  or id in (select profile_id from public.sellers where id = public.current_seller_id())
  or id in (select profile_id from public.customers where seller_id = public.current_seller_id())
);

create policy profiles_update_self on public.profiles for update
using (id = auth.uid() or public.is_superadmin())
with check (id = auth.uid() or public.is_superadmin());

create policy profiles_admin_insert on public.profiles for insert
with check (public.is_superadmin());

-- sellers
create policy sellers_select on public.sellers for select
using (
  public.is_superadmin()
  or public.is_support()
  or profile_id = auth.uid()
  or status = 'active'
);

create policy sellers_admin_write on public.sellers for all
using (public.is_superadmin())
with check (public.is_superadmin());

create policy sellers_update_own on public.sellers for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- customers
create policy customers_select on public.customers for select
using (
  public.is_superadmin()
  or public.is_support()
  or seller_id = public.current_seller_id()
  or profile_id = auth.uid()
);

create policy customers_seller_write on public.customers for insert
with check (public.is_superadmin() or seller_id = public.current_seller_id());

create policy customers_seller_update on public.customers for update
using (public.is_superadmin() or seller_id = public.current_seller_id())
with check (public.is_superadmin() or seller_id = public.current_seller_id());

-- platforms: catálogo público de lectura
create policy platforms_select on public.platforms for select using (true);
create policy platforms_admin_write on public.platforms for all
using (public.is_superadmin())
with check (public.is_superadmin());

-- products
create policy products_select on public.products for select
using (
  public.is_superadmin()
  or public.is_support()
  or seller_id = public.current_seller_id()
  or (status = 'active' and seller_id in (select id from public.sellers where status = 'active'))
);

create policy products_seller_write on public.products for insert
with check (public.is_superadmin() or seller_id = public.current_seller_id());

create policy products_seller_update on public.products for update
using (public.is_superadmin() or seller_id = public.current_seller_id())
with check (public.is_superadmin() or seller_id = public.current_seller_id());

-- orders
create policy orders_select on public.orders for select
using (
  public.is_superadmin()
  or public.is_support()
  or seller_id = public.current_seller_id()
  or customer_id = public.current_customer_id()
);

create policy orders_no_direct_insert on public.orders for insert
with check (false);

create policy orders_seller_update on public.orders for update
using (public.is_superadmin() or seller_id = public.current_seller_id())
with check (public.is_superadmin() or seller_id = public.current_seller_id());

-- order_items
create policy order_items_select on public.order_items for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (
        public.is_superadmin()
        or public.is_support()
        or o.seller_id = public.current_seller_id()
        or o.customer_id = public.current_customer_id()
      )
  )
);

-- receipts
create policy receipts_select on public.payment_receipts for select
using (
  public.is_superadmin()
  or seller_id = public.current_seller_id()
  or exists (
    select 1 from public.orders o
    where o.id = order_id and o.customer_id = public.current_customer_id()
  )
);

-- services
create policy services_select on public.services for select
using (
  public.is_superadmin()
  or public.is_support()
  or seller_id = public.current_seller_id()
  or customer_id = public.current_customer_id()
);

create policy services_seller_write on public.services for insert
with check (public.is_superadmin() or seller_id = public.current_seller_id());

create policy services_seller_update on public.services for update
using (public.is_superadmin() or seller_id = public.current_seller_id())
with check (public.is_superadmin() or seller_id = public.current_seller_id());

-- expenses
create policy expenses_select on public.expenses for select
using (public.is_superadmin() or seller_id = public.current_seller_id());

create policy expenses_write on public.expenses for insert
with check (public.is_superadmin() or seller_id = public.current_seller_id());

-- suppliers: admin write, authorized sellers read active
create policy suppliers_admin on public.suppliers for all
using (public.is_superadmin())
with check (public.is_superadmin());

create policy suppliers_seller_read on public.suppliers for select
using (public.is_superadmin() or (status = 'active' and public.current_seller_id() is not null));

create policy supplier_products_admin on public.supplier_products for all
using (public.is_superadmin())
with check (public.is_superadmin());

create policy supplier_products_seller_read on public.supplier_products for select
using (public.is_superadmin() or (status = 'active' and public.current_seller_id() is not null));

-- tickets
create policy tickets_select on public.support_tickets for select
using (
  public.is_superadmin()
  or public.is_support()
  or seller_id = public.current_seller_id()
  or customer_id = public.current_customer_id()
  or created_by = auth.uid()
);

create policy tickets_insert on public.support_tickets for insert
with check (
  public.is_superadmin()
  or seller_id = public.current_seller_id()
  or customer_id = public.current_customer_id()
);

create policy tickets_update on public.support_tickets for update
using (
  public.is_superadmin()
  or public.is_support()
  or seller_id = public.current_seller_id()
)
with check (
  public.is_superadmin()
  or public.is_support()
  or seller_id = public.current_seller_id()
);

-- audit: insert via definer functions; select admin/support/own seller
create policy audit_select on public.audit_logs for select
using (public.is_superadmin() or public.is_support() or actor_id = auth.uid());

-- Checkout: precios SIEMPRE desde products, nunca desde el cliente
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
begin
  if length(trim(p_name)) < 2 or length(trim(p_whatsapp)) < 6 then
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

  insert into public.customers (seller_id, name, whatsapp, email, status)
  values (v_seller.id, trim(p_name), trim(p_whatsapp), nullif(trim(p_email), ''), 'active')
  on conflict (seller_id, whatsapp)
  do update set
    name = excluded.name,
    email = coalesce(excluded.email, public.customers.email),
    status = 'active'
  returning id into v_customer_id;

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

create or replace function public.attach_receipt(
  p_order_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_id uuid;
begin
  if p_mime_type not in ('image/png', 'image/jpeg') then
    raise exception 'tipo de archivo no permitido';
  end if;
  if p_size_bytes is null or p_size_bytes <= 0 or p_size_bytes > 5242880 then
    raise exception 'tamaño de voucher inválido';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'pedido no encontrado';
  end if;

  if p_storage_path not like v_order.seller_id::text || '/' || v_order.id::text || '/%' then
    raise exception 'ruta de almacenamiento inválida';
  end if;

  insert into public.payment_receipts (order_id, seller_id, storage_path, mime_type, size_bytes)
  values (p_order_id, v_order.seller_id, p_storage_path, p_mime_type, p_size_bytes)
  returning id into v_id;

  update public.orders
  set payment_status = 'submitted',
      order_status = 'pending_review'
  where id = p_order_id
    and order_status in ('pending_payment', 'pending_review');

  return v_id;
end;
$$;

create or replace function public.review_order(p_order_id uuid, p_approve boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_product public.products%rowtype;
  v_service_id uuid;
begin
  if not (public.is_superadmin() or exists (
    select 1 from public.orders o
    where o.id = p_order_id and o.seller_id = public.current_seller_id()
  )) then
    raise exception 'no autorizado';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;

  if v_order.order_status = 'approved' then
    select id into v_service_id from public.services where order_id = p_order_id;
    return v_service_id;
  end if;

  if v_order.order_status not in ('pending_review', 'pending_payment') then
    raise exception 'el pedido no puede revisarse';
  end if;

  if not p_approve then
    update public.orders
    set order_status = 'rejected',
        payment_status = 'rejected',
        reviewed_at = now(),
        reviewed_by = auth.uid()
    where id = p_order_id;
    insert into public.audit_logs (actor_id, role, action, entity, entity_id, result)
    values (auth.uid(), public.auth_role(), 'reject_order', 'orders', p_order_id::text, 'rejected');
    return null;
  end if;

  select * into v_product from public.products where id = v_order.product_id;

  update public.orders
  set order_status = 'approved',
      payment_status = 'paid',
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = p_order_id;

  insert into public.services (
    seller_id, customer_id, product_id, platform_id, order_id,
    start_date, end_date, cost_price, sale_price, status
  )
  values (
    v_order.seller_id,
    v_order.customer_id,
    v_order.product_id,
    v_product.platform_id,
    v_order.id,
    current_date,
    current_date + v_order.duration_days,
    v_order.cost_price,
    v_order.amount,
    'active'
  )
  on conflict (order_id) do nothing
  returning id into v_service_id;

  if v_service_id is null then
    select id into v_service_id from public.services where order_id = p_order_id;
  end if;

  insert into public.audit_logs (actor_id, role, action, entity, entity_id, result)
  values (auth.uid(), public.auth_role(), 'approve_order', 'orders', p_order_id::text, 'approved');

  return v_service_id;
end;
$$;

grant execute on function public.place_order(text, uuid, text, text, text, public.payment_method) to anon, authenticated;
grant execute on function public.attach_receipt(uuid, text, text, integer) to anon, authenticated;
grant execute on function public.review_order(uuid, boolean) to authenticated;
