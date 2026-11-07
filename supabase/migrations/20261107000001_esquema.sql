-- Esquema del armario virtual (spec §4.1)

create function public.paleta() returns text[]
language sql immutable as $$
  select array['negro','blanco','gris','beige','marrón','azul marino','azul','celeste','verde',
               'rojo','rosado','morado','amarillo','naranja','dorado','plateado','estampado']
$$;

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text check (char_length(nombre) <= 80),
  es_admin boolean not null default false,
  premium_hasta timestamptz,
  creado_en timestamptz not null default now()
);

create table public.prendas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  foto_path text not null,
  estado text not null check (estado in ('lista', 'sin_clasificar')),
  categoria text check (categoria in ('arriba', 'abajo', 'vestido', 'calzado', 'abrigo', 'accesorio')),
  tipo text check (char_length(tipo) <= 40),
  colores text[] check (colores is null or (cardinality(colores) between 1 and 3 and colores <@ public.paleta())),
  formalidad text check (formalidad in ('formal', 'informal', 'ambas')),
  calidez text check (calidez in ('ligera', 'media', 'abrigada')),
  creado_en timestamptz not null default now(),
  check (estado = 'sin_clasificar' or categoria is not null)
);
create index prendas_usuario on public.prendas (usuario_id);

create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  titulo text not null check (char_length(titulo) <= 60),
  frase text not null check (char_length(frase) <= 200),
  creado_en timestamptz not null default now()
);
create index outfits_usuario on public.outfits (usuario_id);

create table public.outfit_prendas (
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  prenda_id uuid not null references public.prendas (id) on delete cascade,
  primary key (outfit_id, prenda_id)
);
create index outfit_prendas_prenda on public.outfit_prendas (prenda_id);

create table public.agenda (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  fecha date not null,
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  unique (usuario_id, fecha)
);

create table public.uso_ia (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('clasificar', 'outfit')),
  creado_en timestamptz not null default now()
);
create index uso_ia_conteo on public.uso_ia (usuario_id, tipo, creado_en);

create table public.pases (
  id text primary key,
  nombre text not null,
  dias int not null check (dias > 0),
  precio numeric(6, 2) not null check (precio > 0)
);
insert into public.pases (id, nombre, dias, precio) values
  ('1m', '1 mes', 30, 9.90),
  ('3m', '3 meses', 90, 24.90),
  ('12m', '12 meses', 365, 79.90);

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  pase_id text not null references public.pases (id),
  monto numeric(6, 2) not null,
  numero_operacion text not null constraint pagos_numero_operacion_key unique
    check (numero_operacion ~ '^[0-9]{6,20}$'),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  creado_en timestamptz not null default now(),
  revisado_en timestamptz
);
create unique index pagos_un_pendiente on public.pagos (usuario_id) where estado = 'pendiente';

-- Al registrarse: perfil con 7 días de Premium gratis (spec §6.1)
create function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, creado_en, premium_hasta)
  values (new.id, now(), now() + interval '7 days');
  return new;
end;
$$;

create trigger al_registrarse
  after insert on auth.users
  for each row execute function public.crear_perfil();
