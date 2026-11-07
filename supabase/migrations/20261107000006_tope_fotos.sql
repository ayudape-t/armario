-- Que una sola cuenta no pueda llenar el almacenamiento de todos.
-- Las fotos de la app pesan ~150 KB; 1 MB deja margen. 2200 archivos = 1000 prendas Premium × 2 tamaños + margen.
update storage.buckets set file_size_limit = 1048576 where id = 'prendas';

create function public.cantidad_fotos() returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from storage.objects
  where bucket_id = 'prendas' and (storage.foldername(name))[1] = auth.uid()::text
$$;
revoke execute on function public.cantidad_fotos() from public, anon;
grant execute on function public.cantidad_fotos() to authenticated;

drop policy "fotos propias: subir" on storage.objects;
create policy "fotos propias: subir" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'prendas'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.cantidad_fotos() < 2200
  );
