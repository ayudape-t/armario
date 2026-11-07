begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- A: admin · B: Premium vencido · C: Premium vigente 5 días · D: recién registrado · E: vencido
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@prueba.pe'),
  ('00000000-0000-0000-0000-00000000000b', 'b@prueba.pe'),
  ('00000000-0000-0000-0000-00000000000c', 'c@prueba.pe'),
  ('00000000-0000-0000-0000-00000000000d', 'd@prueba.pe'),
  ('00000000-0000-0000-0000-00000000000e', 'e@prueba.pe');
update public.perfiles set es_admin = true where id = '00000000-0000-0000-0000-00000000000a';
update public.perfiles set premium_hasta = now() - interval '1 day'
  where id in ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000e');
update public.perfiles set premium_hasta = now() + interval '5 days' where id = '00000000-0000-0000-0000-00000000000c';
insert into public.pagos (id, usuario_id, pase_id, monto, numero_operacion) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000b', '1m', 0, '11111111'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000000c', '3m', 0, '22222222');

-- un cliente común no puede usar las funciones de admin
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select throws_ok($$ select public.aprobar_pago('00000000-0000-0000-0000-0000000000f1') $$, 'P0001', 'no autorizado', 'un cliente no aprueba pagos');
select throws_ok($$ select public.rechazar_pago('00000000-0000-0000-0000-0000000000f1') $$, 'P0001', 'no autorizado', 'un cliente no rechaza pagos');
select throws_ok($$ select public.regalar_premium('b@prueba.pe', 30) $$, 'P0001', 'no autorizado', 'un cliente no se regala Premium');
select throws_ok($$ select * from public.pagos_pendientes() $$, 'P0001', 'no autorizado', 'un cliente no ve los pagos pendientes');
select throws_ok($$ select public.estado_limites('00000000-0000-0000-0000-00000000000c') $$, 'P0001', 'no autorizado', 'un cliente no ve los límites de otro');

-- el admin aprueba
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.aprobar_pago('00000000-0000-0000-0000-0000000000f1');
select public.aprobar_pago('00000000-0000-0000-0000-0000000000f2');
reset role;
select ok((select abs(extract(epoch from premium_hasta - (now() + interval '30 days'))) < 60
  from public.perfiles where id = '00000000-0000-0000-0000-00000000000b'), 'Premium vencido + 1 mes = 30 días desde hoy');
select ok((select abs(extract(epoch from premium_hasta - (now() + interval '95 days'))) < 60
  from public.perfiles where id = '00000000-0000-0000-0000-00000000000c'), 'Premium vigente + 3 meses suma a lo que quedaba');

-- doble toque en Aprobar
create temporary table antes as select premium_hasta from public.perfiles where id = '00000000-0000-0000-0000-00000000000b';
grant select on antes to authenticated;
set local role authenticated;
select throws_ok($$ select public.aprobar_pago('00000000-0000-0000-0000-0000000000f1') $$, 'P0001', 'el pago ya fue revisado', 'aprobar dos veces falla');
reset role;
select is((select premium_hasta from public.perfiles where id = '00000000-0000-0000-0000-00000000000b'), (select premium_hasta from antes),
  'aprobar dos veces no suma días dos veces');

-- regalar Premium
set local role authenticated;
select public.regalar_premium('b@prueba.pe', 10);
select throws_ok($$ select public.regalar_premium('nadie@prueba.pe', 5) $$, 'P0001', 'cliente no encontrado', 'regalar a un correo inexistente falla');
reset role;
select is((select premium_hasta from public.perfiles where id = '00000000-0000-0000-0000-00000000000b'), (select premium_hasta + interval '10 days' from antes),
  'regalar 10 días los suma');

-- pagos pendientes con el correo del cliente; rechazar
set local request.jwt.claims to '{}';
insert into public.pagos (id, usuario_id, pase_id, monto, numero_operacion) values
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-00000000000b', '12m', 0, '33333333');
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select results_eq($$ select correo, pase, monto, numero_operacion from public.pagos_pendientes() $$,
  $$ values ('b@prueba.pe'::text, '12 meses'::text, 79.90::numeric, '33333333'::text) $$,
  'el admin ve solo los pendientes, con correo y pase');
select public.rechazar_pago('00000000-0000-0000-0000-0000000000f3');
reset role;
select results_eq($$ select estado, revisado_en is not null from public.pagos where id = '00000000-0000-0000-0000-0000000000f3' $$,
  $$ values ('rechazado'::text, true) $$, 'rechazar marca el pago y la fecha de revisión');

-- estado de límites
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select results_eq($$ select (e->>'premium')::bool, (e->>'en_prueba')::bool, (e->>'max_prendas')::int, (e->>'max_outfits')::int, (e->>'max_clasificaciones')::int
  from public.estado_limites() e $$, $$ values (true, true, 1000, 30, 100) $$, 'recién registrado: Premium de prueba');

reset role;
insert into public.uso_ia (usuario_id, tipo, creado_en) values
  ('00000000-0000-0000-0000-00000000000e', 'outfit', (date_trunc('day', now() at time zone 'America/Lima') at time zone 'America/Lima') - interval '1 minute'),
  ('00000000-0000-0000-0000-00000000000e', 'outfit', (date_trunc('day', now() at time zone 'America/Lima') at time zone 'America/Lima') + interval '1 minute'),
  ('00000000-0000-0000-0000-00000000000e', 'clasificar', now());
set local role service_role;
set local request.jwt.claims to '{"role":"service_role"}';
select results_eq($$ select (e->>'premium')::bool, (e->>'en_prueba')::bool, (e->>'max_prendas')::int, (e->>'max_outfits')::int, (e->>'max_clasificaciones')::int
  from public.estado_limites('00000000-0000-0000-0000-00000000000e') e $$, $$ values (false, false, 50, 3, 100) $$, 'Premium vencido: límites gratis');
select results_eq($$ select (e->>'outfits_hoy')::int, (e->>'clasificaciones_hoy')::int from public.estado_limites('00000000-0000-0000-0000-00000000000e') e $$,
  $$ values (1, 1) $$, 'el día se cuenta desde la medianoche de Lima');

reset role;
select * from finish();
rollback;
