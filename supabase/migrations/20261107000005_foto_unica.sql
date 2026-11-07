-- Una foto = una prenda: reintentar la clasificación no duplica prendas.
create unique index prendas_foto_unica on public.prendas (foto_path);
