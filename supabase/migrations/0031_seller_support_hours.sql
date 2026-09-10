alter table public.sellers
  add column if not exists support_hours text not null default 'Lun a Dom · 8:00 am – 11:00 pm';
