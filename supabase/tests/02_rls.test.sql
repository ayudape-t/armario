begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

-- datos (como postgres)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@prueba.pe'),
  ('00000000-0000-0000-0000-00000000000b', 'b@prueba.pe');
insert into public.prendas (id, usuario_id, foto_path, estado, categoria) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'a/1.webp', 'lista', 'arriba'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', 'a/2.webp', 'lista', 'calzado'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'b/1.webp', 'lista', 'vestido');
insert into public.outfits (id, usuario_id, titulo, frase) values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000000b', 'B', 'de B');
insert into public.agenda (usuario_id, fecha, outfit_id) values
  ('00000000-0000-0000-0000-00000000000b', '2026-12-01', '00000000-0000-0000-0000-0000000000b2');
insert into public.pagos (usuario_id, pase_id, monto, numero_operacion) values
  ('00000000-0000-0000-0000-00000000000b', '1m', 9.90, '11111111');
insert into public.uso_ia (usuario_id, tipo) values ('00000000-0000-0000-0000-00000000000b', 'outfit');

-- sesión de A
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is((select count(*)::int from public.prendas where usuario_id = '00000000-0000-0000-0000-00000000000b'), 0, 'A no ve prendas de B');
select is((select count(*)::int from public.outfits where usuario_id = '00000000-0000-0000-0000-00000000000b'), 0, 'A no ve outfits de B');
select is((select count(*)::int from public.agenda where usuario_id = '00000000-0000-0000-0000-00000000000b'), 0, 'A no ve la agenda de B');
select is((select count(*)::int from public.pagos where usuario_id = '00000000-0000-0000-0000-00000000000b'), 0, 'A no ve pagos de B');
select is((select count(*)::int from public.uso_ia where usuario_id = '00000000-0000-0000-0000-00000000000b'), 0, 'A no ve el uso de IA de B');

select throws_ok($$ update public.perfiles set premium_hasta = now() + interval '1 year' where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null, 'A no puede darse Premium');
select throws_ok($$ update public.perfiles set es_admin = true where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null, 'A no puede hacerse admin');
select lives_ok($$ update public.perfiles set nombre = 'Ana' where id = '00000000-0000-0000-0000-00000000000a' $$, 'A puede cambiar su nombre');
select is((select nombre from public.perfiles where id = '00000000-0000-0000-0000-00000000000a'), 'Ana', 'el nombre quedó cambiado');

select throws_ok($$ insert into public.prendas (usuario_id, foto_path, estado, categoria)
  values ('00000000-0000-0000-0000-00000000000a', 'a/9.webp', 'lista', 'arriba') $$,
  '42501', null, 'A no puede insertar prendas directamente');
select lives_ok($$ update public.prendas set categoria = 'abajo' where id = '00000000-0000-0000-0000-0000000000a1' $$, 'A puede editar la ficha de su prenda');
select is((select categoria from public.prendas where id = '00000000-0000-0000-0000-0000000000a1'), 'abajo', 'la ficha quedó editada');
select throws_ok($$ update public.prendas set usuario_id = '00000000-0000-0000-0000-00000000000b' where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'A no puede cambiar el dueño de una prenda');

select lives_ok($$ insert into public.pagos (usuario_id, pase_id, monto, numero_operacion, estado)
  values ('00000000-0000-0000-0000-00000000000b', '1m', 1, '22222222', 'aprobado') $$, 'A registra un pago');
select results_eq($$ select monto, estado, usuario_id from public.pagos where numero_operacion = '22222222' $$,
  $$ values (9.90::numeric(6,2), 'pendiente'::text, '00000000-0000-0000-0000-00000000000a'::uuid) $$,
  'el pago queda pendiente, con el precio del pase y a nombre de A');

select throws_ok($$ select public.guardar_outfit('Mezcla', 'con prenda ajena',
  array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1']::uuid[]) $$,
  '42501', null, 'no se puede guardar un outfit con una prenda ajena');
select is((select count(*)::int from public.outfits), 0, 'no quedó ningún outfit a medias');
select isnt(public.guardar_outfit('Casual', 'polo y zapatillas',
  array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2']::uuid[]), null, 'guardar_outfit devuelve el id');
select is((select count(*)::int from public.outfit_prendas), 2, 'el outfit guardado tiene sus 2 prendas');

select is((select count(*)::int from public.pases), 3, 'un cliente puede leer los pases');
reset role;
set local role anon;
select is((select count(*)::int from public.pases), 3, 'un visitante anónimo puede leer los pases');

reset role;
select * from finish();
rollback;
