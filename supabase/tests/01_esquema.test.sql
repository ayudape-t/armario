begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- usuarios de prueba
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@prueba.pe'),
  ('00000000-0000-0000-0000-00000000000b', 'b@prueba.pe');

-- prueba gratis y perfil
select is((select count(*)::int from public.perfiles where id = '00000000-0000-0000-0000-00000000000a'), 1,
  'registrarse crea el perfil');
select ok((select premium_hasta = creado_en + interval '7 days' from public.perfiles where id = '00000000-0000-0000-0000-00000000000a'),
  'el perfil nace con 7 días de Premium');
select is((select es_admin from public.perfiles where id = '00000000-0000-0000-0000-00000000000a'), false,
  'el perfil no nace admin');

-- prendas
select throws_ok($$ insert into public.prendas (usuario_id, foto_path, estado)
  values ('00000000-0000-0000-0000-00000000000a', 'a/1.webp', 'lista') $$,
  '23514', null, 'una prenda lista exige categoría');
select lives_ok($$ insert into public.prendas (usuario_id, foto_path, estado)
  values ('00000000-0000-0000-0000-00000000000a', 'a/2.webp', 'sin_clasificar') $$,
  'una prenda sin clasificar puede tener la ficha vacía');
select throws_ok($$ insert into public.prendas (usuario_id, foto_path, estado, categoria, colores)
  values ('00000000-0000-0000-0000-00000000000a', 'a/3.webp', 'lista', 'arriba', '{fucsia}') $$,
  '23514', null, 'colores fuera de la paleta se rechazan');
select throws_ok($$ insert into public.prendas (usuario_id, foto_path, estado, categoria, colores)
  values ('00000000-0000-0000-0000-00000000000a', 'a/4.webp', 'lista', 'arriba', '{negro,blanco,gris,beige}') $$,
  '23514', null, 'más de 3 colores se rechazan');
select lives_ok($$ insert into public.prendas (id, usuario_id, foto_path, estado, categoria, colores)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a', 'a/5.webp', 'lista', 'vestido', '{negro,dorado}') $$,
  'colores válidos se aceptan');
select throws_ok($$ insert into public.prendas (usuario_id, foto_path, estado, categoria, tipo)
  values ('00000000-0000-0000-0000-00000000000a', 'a/6.webp', 'lista', 'arriba', repeat('x', 41)) $$,
  '23514', null, 'tipo de más de 40 caracteres se rechaza');

select throws_ok($$ insert into public.prendas (usuario_id, foto_path, estado)
  values ('00000000-0000-0000-0000-00000000000a', 'a/2.webp', 'sin_clasificar') $$,
  '23505', null, 'una misma foto no crea dos prendas');

-- pagos
select throws_ok($$ insert into public.pagos (usuario_id, pase_id, monto, numero_operacion)
  values ('00000000-0000-0000-0000-00000000000a', '1m', 9.90, '12345') $$,
  '23514', null, 'número de operación de 5 dígitos se rechaza');
select throws_ok($$ insert into public.pagos (usuario_id, pase_id, monto, numero_operacion)
  values ('00000000-0000-0000-0000-00000000000a', '1m', 9.90, '12a456') $$,
  '23514', null, 'número de operación con letras se rechaza');
select lives_ok($$ insert into public.pagos (usuario_id, pase_id, monto, numero_operacion)
  values ('00000000-0000-0000-0000-00000000000a', '1m', 9.90, '123456') $$,
  'número de operación válido se acepta');
select throws_ok($$ insert into public.pagos (usuario_id, pase_id, monto, numero_operacion)
  values ('00000000-0000-0000-0000-00000000000b', '1m', 9.90, '123456') $$,
  '23505', null, 'un número de operación no se repite');
select throws_ok($$ insert into public.pagos (usuario_id, pase_id, monto, numero_operacion)
  values ('00000000-0000-0000-0000-00000000000a', '3m', 24.90, '7654321') $$,
  '23505', null, 'solo un pago pendiente por cliente');

-- outfits: borrar una prenda limpia sus enlaces y deja el outfit
insert into public.prendas (id, usuario_id, foto_path, estado, categoria)
  values ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000000a', 'a/7.webp', 'lista', 'calzado');
insert into public.outfits (id, usuario_id, titulo, frase)
  values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000000a', 'Noche', 'Prueba');
insert into public.outfit_prendas (outfit_id, prenda_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c2');
delete from public.prendas where id = '00000000-0000-0000-0000-0000000000c1';
select is((select count(*)::int from public.outfit_prendas where outfit_id = '00000000-0000-0000-0000-0000000000d1'), 1,
  'borrar una prenda quita su enlace del outfit');
select is((select count(*)::int from public.outfits where id = '00000000-0000-0000-0000-0000000000d1'), 1,
  'el outfit se mantiene');

-- agenda: un outfit por día
insert into public.agenda (usuario_id, fecha, outfit_id)
  values ('00000000-0000-0000-0000-00000000000a', '2026-12-01', '00000000-0000-0000-0000-0000000000d1');
select throws_ok($$ insert into public.agenda (usuario_id, fecha, outfit_id)
  values ('00000000-0000-0000-0000-00000000000a', '2026-12-01', '00000000-0000-0000-0000-0000000000d1') $$,
  '23505', null, 'un solo outfit por día');

-- pases
select is((select count(*)::int from public.pases), 3, 'hay 3 pases');
select is((select precio from public.pases where id = '12m'), 79.90::numeric, 'el pase de 12 meses cuesta S/79.90');

select * from finish();
rollback;
