insert into public.platforms (slug, name, tagline, available, accent_from, accent_to)
values
  ('netflix', 'Netflix', 'Series, películas y originales', true, '#7f1d1d', '#ef4444'),
  ('disney-plus', 'Disney+', 'Marvel, Star Wars y más', true, '#0f172a', '#2563eb'),
  ('disney-estandar', 'Disney Estándar', 'Plan estándar de Disney+', true, '#0f172a', '#2563eb'),
  ('disney-premium', 'Disney Premium', 'Plan premium de Disney+', true, '#0f172a', '#2563eb'),
  ('max', 'HBO MAX', 'HBO y entretenimiento premium', true, '#1e1b4b', '#818cf8'),
  ('prime-video', 'Prime Video', 'Cine y series exclusivas', true, '#0c4a6e', '#38bdf8'),
  ('crunchyroll', 'Crunchyroll', 'Anime y simulcast', true, '#7c2d12', '#f97316'),
  ('paramount-plus', 'Paramount+', 'Deportes, cine y series', true, '#1e3a8a', '#60a5fa')
on conflict (slug) do nothing;
