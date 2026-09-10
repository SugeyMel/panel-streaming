insert into public.platforms (slug, name, tagline, available, accent_from, accent_to)
values
  ('disney-estandar', 'Disney Estándar', 'Plan estándar de Disney+', true, '#0f172a', '#2563eb'),
  ('disney-premium', 'Disney Premium', 'Plan premium de Disney+', true, '#0f172a', '#2563eb')
on conflict (slug) do nothing;
