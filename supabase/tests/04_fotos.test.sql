begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@prueba.pe'),
  ('00000000-0000-0000-0000-00000000000b', 'b@prueba.pe');
insert into storage.objects (bucket_id, name) values ('prendas', '00000000-0000-0000-0000-00000000000b/foto.webp');

select results_eq($$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'prendas' $$,
  $$ values (false, 5242880::bigint, array['image/webp','image/jpeg','image/png']) $$, 'bucket privado, 5 MB, solo imágenes');

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('prendas', '00000000-0000-0000-0000-00000000000b/x.webp') $$,
  '42501', null, 'A no puede subir a la carpeta de B');
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('prendas', '00000000-0000-0000-0000-00000000000a/x.webp') $$,
  'A puede subir a su carpeta');
select is((select count(*)::int from storage.objects where name like '00000000-0000-0000-0000-00000000000b/%'), 0, 'A no ve las fotos de B');
select is((select count(*)::int from storage.objects where name like '00000000-0000-0000-0000-00000000000a/%'), 1, 'A ve sus fotos');

reset role;
select * from finish();
rollback;
