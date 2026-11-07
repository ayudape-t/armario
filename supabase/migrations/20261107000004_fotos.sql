-- Fotos de prendas (spec §4.3): bucket privado, una carpeta por cliente.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prendas', 'prendas', false, 5242880, array['image/webp', 'image/jpeg', 'image/png']);

create policy "fotos propias: ver" on storage.objects for select to authenticated
  using (bucket_id = 'prendas' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos propias: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'prendas' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos propias: reemplazar" on storage.objects for update to authenticated
  using (bucket_id = 'prendas' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos propias: borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'prendas' and (storage.foldername(name))[1] = auth.uid()::text);
