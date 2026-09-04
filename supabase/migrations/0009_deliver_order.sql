alter table public.orders
  add column if not exists delivery_note text,
  add column if not exists delivered_at timestamptz;

alter table public.services
  add column if not exists access_password text,
  add column if not exists access_profile text;

comment on column public.orders.delivery_note is 'Mensaje visible para el cliente cuando el vendedor entrega el servicio.';
comment on column public.services.access_password is 'Clave o PIN de la cuenta, visible para el cliente dueño del servicio.';
comment on column public.services.access_profile is 'Perfil o puesto asignado dentro de la cuenta.';

create or replace function public.deliver_order(
  p_order_id uuid,
  p_platform_email text,
  p_access_password text,
  p_access_profile text,
  p_delivery_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_service_id uuid;
begin
  if not (public.is_superadmin() or exists (
    select 1 from public.orders o
    where o.id = p_order_id and o.seller_id = public.current_seller_id()
  )) then
    raise exception 'no autorizado';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then
    raise exception 'pedido no encontrado';
  end if;
  if v_order.order_status not in ('approved', 'delivered') then
    raise exception 'primero aprueba el pago';
  end if;

  select id into v_service_id from public.services where order_id = p_order_id;
  if v_service_id is null then
    raise exception 'no hay servicio ligado a este pedido';
  end if;

  update public.services
  set platform_email = nullif(trim(p_platform_email), ''),
      access_password = nullif(trim(p_access_password), ''),
      access_profile = nullif(trim(p_access_profile), ''),
      notes = coalesce(nullif(trim(p_delivery_note), ''), notes),
      updated_at = now()
  where id = v_service_id;

  update public.orders
  set order_status = 'delivered',
      delivery_note = coalesce(
        nullif(trim(p_delivery_note), ''),
        'Tu servicio ya fue entregado. Revisa Centro de acceso.'
      ),
      delivered_at = now()
  where id = p_order_id;

  insert into public.audit_logs (actor_id, role, action, entity, entity_id, result)
  values (auth.uid(), public.auth_role(), 'deliver_order', 'orders', p_order_id::text, 'delivered');

  return v_service_id;
end;
$$;

grant execute on function public.deliver_order(uuid, text, text, text, text) to authenticated;
notify pgrst, 'reload schema';
