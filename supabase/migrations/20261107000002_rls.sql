-- Reglas de acceso (spec §4.2)

alter table public.perfiles enable row level security;
alter table public.prendas enable row level security;
alter table public.outfits enable row level security;
alter table public.outfit_prendas enable row level security;
alter table public.agenda enable row level security;
alter table public.uso_ia enable row level security;
alter table public.pases enable row level security;
alter table public.pagos enable row level security;

-- Permisos de tabla: lo mínimo; RLS decide qué filas.
revoke all on public.perfiles, public.prendas, public.outfits, public.outfit_prendas,
  public.agenda, public.uso_ia, public.pases, public.pagos from anon, authenticated;
grant select on public.pases to anon, authenticated;
grant select on public.perfiles, public.prendas, public.uso_ia, public.pagos to authenticated;
grant update (nombre) on public.perfiles to authenticated;
grant update (categoria, tipo, colores, formalidad, calidez, estado), delete on public.prendas to authenticated;
grant select, insert, update, delete on public.outfits, public.agenda to authenticated;
grant select, insert, delete on public.outfit_prendas to authenticated;
grant insert (pase_id, numero_operacion, usuario_id, monto, estado) on public.pagos to authenticated;

alter table public.outfits alter column usuario_id set default auth.uid();
alter table public.agenda alter column usuario_id set default auth.uid();
alter table public.pagos alter column usuario_id set default auth.uid();

create policy "pases visibles" on public.pases for select to anon, authenticated using (true);

create policy "perfil propio" on public.perfiles for select to authenticated using (id = auth.uid());
create policy "perfil propio editable" on public.perfiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "prendas propias" on public.prendas for select to authenticated using (usuario_id = auth.uid());
create policy "prendas propias editables" on public.prendas for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "prendas propias borrables" on public.prendas for delete to authenticated using (usuario_id = auth.uid());

create policy "outfits propios" on public.outfits for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

create policy "enlaces de outfits propios" on public.outfit_prendas for select to authenticated
  using (exists (select 1 from public.outfits o where o.id = outfit_id and o.usuario_id = auth.uid()));
create policy "enlazar solo lo propio" on public.outfit_prendas for insert to authenticated
  with check (
    exists (select 1 from public.outfits o where o.id = outfit_id and o.usuario_id = auth.uid())
    and exists (select 1 from public.prendas p where p.id = prenda_id and p.usuario_id = auth.uid())
  );
create policy "desenlazar lo propio" on public.outfit_prendas for delete to authenticated
  using (exists (select 1 from public.outfits o where o.id = outfit_id and o.usuario_id = auth.uid()));

create policy "agenda propia" on public.agenda for all to authenticated
  using (usuario_id = auth.uid())
  with check (
    usuario_id = auth.uid()
    and exists (select 1 from public.outfits o where o.id = outfit_id and o.usuario_id = auth.uid())
  );

create policy "uso propio" on public.uso_ia for select to authenticated using (usuario_id = auth.uid());

create policy "pagos propios" on public.pagos for select to authenticated using (usuario_id = auth.uid());
create policy "registrar pago propio" on public.pagos for insert to authenticated with check (usuario_id = auth.uid());

-- El cliente no elige monto, estado ni dueño del pago.
create function public.preparar_pago() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.usuario_id := coalesce(auth.uid(), new.usuario_id);
  new.estado := 'pendiente';
  new.revisado_en := null;
  new.monto := (select precio from public.pases where id = new.pase_id);
  return new;
end;
$$;
create trigger antes_de_pagar before insert on public.pagos
  for each row execute function public.preparar_pago();

-- Guarda un outfit y sus prendas en una sola transacción (RLS aplica: security invoker).
create function public.guardar_outfit(p_titulo text, p_frase text, p_prendas uuid[]) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.outfits (usuario_id, titulo, frase) values (auth.uid(), p_titulo, p_frase)
  returning id into v_id;
  insert into public.outfit_prendas (outfit_id, prenda_id) select v_id, unnest(p_prendas);
  return v_id;
end;
$$;
revoke execute on function public.guardar_outfit(text, text, uuid[]) from public, anon;
grant execute on function public.guardar_outfit(text, text, uuid[]) to authenticated;
revoke execute on function public.preparar_pago() from public, anon, authenticated;
