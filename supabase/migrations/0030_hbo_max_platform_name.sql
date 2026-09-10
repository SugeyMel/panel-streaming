update public.platforms
set name = 'HBO MAX'
where slug = 'max'
   or lower(trim(name)) in ('max', 'hbo max', 'hbo-max');
