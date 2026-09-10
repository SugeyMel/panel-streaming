-- El vendedor puede ver las entradas de stock del catálogo mayorista.
drop policy if exists wholesale_stock_entries_seller_read on public.wholesale_stock_entries;
create policy wholesale_stock_entries_seller_read
on public.wholesale_stock_entries for select
using (public.current_seller_id() is not null);
