-- Funciones de administrador y estado de límites (spec §4.2, §4.4)

create function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select es_admin from public.perfiles where id = auth.uid()), false)
$$;

create function public.sumar_premium(p_usuario uuid, p_dias int) returns void
language sql security definer set search_path = public as $$
  update public.perfiles
  set premium_hasta = greatest(now(), coalesce(premium_hasta, now())) + make_interval(days => p_dias)
  where id = p_usuario
$$;

create function public.aprobar_pago(p_pago uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_usuario uuid;
  v_estado text;
  v_dias int;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  select p.usuario_id, p.estado, pa.dias into v_usuario, v_estado, v_dias
  from public.pagos p join public.pases pa on pa.id = p.pase_id
  where p.id = p_pago
  for update of p;
  if not found then raise exception 'pago no encontrado'; end if;
  if v_estado <> 'pendiente' then raise exception 'el pago ya fue revisado'; end if;
  update public.pagos set estado = 'aprobado', revisado_en = now() where id = p_pago;
  perform public.sumar_premium(v_usuario, v_dias);
end;
$$;

create function public.rechazar_pago(p_pago uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_estado text;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  select estado into v_estado from public.pagos where id = p_pago for update;
  if not found then raise exception 'pago no encontrado'; end if;
  if v_estado <> 'pendiente' then raise exception 'el pago ya fue revisado'; end if;
  update public.pagos set estado = 'rechazado', revisado_en = now() where id = p_pago;
end;
$$;

create function public.regalar_premium(p_correo text, p_dias int) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_usuario uuid;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if p_dias not between 1 and 365 then raise exception 'días fuera de rango'; end if;
  select id into v_usuario from auth.users where lower(email) = lower(trim(p_correo));
  if not found then raise exception 'cliente no encontrado'; end if;
  perform public.sumar_premium(v_usuario, p_dias);
end;
$$;

create function public.pagos_pendientes()
returns table (id uuid, correo text, pase text, monto numeric, numero_operacion text, creado_en timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  return query
    select p.id, u.email::text, pa.nombre, p.monto::numeric, p.numero_operacion, p.creado_en
    from public.pagos p
    join auth.users u on u.id = p.usuario_id
    join public.pases pa on pa.id = p.pase_id
    where p.estado = 'pendiente'
    order by p.creado_en;
end;
$$;

create function public.estado_limites(p_usuario uuid default auth.uid()) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_perfil public.perfiles;
  v_premium boolean;
  v_inicio timestamptz := date_trunc('day', now() at time zone 'America/Lima') at time zone 'America/Lima';
begin
  if coalesce(auth.role(), '') <> 'service_role' and (auth.uid() is null or p_usuario is distinct from auth.uid()) then
    raise exception 'no autorizado';
  end if;
  select * into v_perfil from public.perfiles where id = p_usuario;
  v_premium := coalesce(v_perfil.premium_hasta > now(), false);
  return jsonb_build_object(
    'premium', v_premium,
    'en_prueba', v_premium and v_perfil.premium_hasta = v_perfil.creado_en + interval '7 days',
    'premium_hasta', v_perfil.premium_hasta,
    'prendas', (select count(*) from public.prendas where usuario_id = p_usuario),
    'max_prendas', case when v_premium then 1000 else 50 end,
    'outfits_hoy', (select count(*) from public.uso_ia where usuario_id = p_usuario and tipo = 'outfit' and creado_en >= v_inicio),
    'max_outfits', case when v_premium then 30 else 3 end,
    'clasificaciones_hoy', (select count(*) from public.uso_ia where usuario_id = p_usuario and tipo = 'clasificar' and creado_en >= v_inicio),
    'max_clasificaciones', 100
  );
end;
$$;

revoke execute on function public.sumar_premium(uuid, int) from public, anon, authenticated, service_role;
revoke execute on function public.es_admin(), public.aprobar_pago(uuid), public.rechazar_pago(uuid),
  public.regalar_premium(text, int), public.pagos_pendientes(), public.estado_limites(uuid) from public, anon;
grant execute on function public.es_admin(), public.aprobar_pago(uuid), public.rechazar_pago(uuid),
  public.regalar_premium(text, int), public.pagos_pendientes(), public.estado_limites(uuid) to authenticated;
grant execute on function public.estado_limites(uuid) to service_role;
