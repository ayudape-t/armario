import type { Ficha } from './ficha.ts';

export type Limites = { prendas: number; max_prendas: number; clasificaciones_hoy: number; max_clasificaciones: number };

export type NuevaPrenda = {
  usuario_id: string;
  foto_path: string;
  estado: 'lista' | 'sin_clasificar';
  categoria: Ficha['categoria'] | null;
  tipo: string | null;
  colores: Ficha['colores'] | null;
  formalidad: Ficha['formalidad'] | null;
  calidez: Ficha['calidez'] | null;
};

export type DepsClasificar = {
  estadoLimites(uid: string): Promise<Limites>;
  registrarUso(uid: string, tipo: 'clasificar'): Promise<void>;
  descargarFoto(ruta: string): Promise<Uint8Array>;
  borrarFotos(ruta: string): Promise<void>;
  insertarPrenda(p: NuevaPrenda): Promise<{ id: string }>;
  /** Lanza si la IA falla o tarda más de 20 s. */
  clasificarConIA(foto: Uint8Array, tipoMime: string): Promise<Ficha>;
};

export type ResultadoClasificar =
  | { ok: true; prenda_id: string; estado: 'lista' | 'sin_clasificar' }
  | { ok: false; error: 'ruta_invalida' | 'limite_prendas' | 'limite_fotos' | 'no_es_prenda' };

export async function procesarClasificacion(deps: DepsClasificar, uid: string, ruta: string): Promise<ResultadoClasificar> {
  const coincide = new RegExp(`^${uid}/[0-9a-f-]{36}\\.(webp|jpg)$`).exec(ruta);
  if (!coincide) return { ok: false, error: 'ruta_invalida' };

  const limites = await deps.estadoLimites(uid);
  if (limites.prendas >= limites.max_prendas) return { ok: false, error: 'limite_prendas' };
  if (limites.clasificaciones_hoy >= limites.max_clasificaciones) return { ok: false, error: 'limite_fotos' };

  await deps.registrarUso(uid, 'clasificar');
  let ficha: Ficha | null = null;
  try {
    ficha = await deps.clasificarConIA(await deps.descargarFoto(ruta), coincide[1] === 'jpg' ? 'image/jpeg' : 'image/webp');
  } catch {
    ficha = null;
  }

  if (ficha && !ficha.es_prenda) {
    await deps.borrarFotos(ruta);
    return { ok: false, error: 'no_es_prenda' };
  }

  const base = { usuario_id: uid, foto_path: ruta };
  const prenda: NuevaPrenda = ficha
    ? {
        ...base,
        estado: 'lista',
        categoria: ficha.categoria,
        tipo: ficha.tipo.slice(0, 40) || null,
        colores: ficha.colores.length ? [...new Set(ficha.colores)].slice(0, 3) : null,
        formalidad: ficha.formalidad,
        calidez: ficha.calidez,
      }
    : { ...base, estado: 'sin_clasificar', categoria: null, tipo: null, colores: null, formalidad: null, calidez: null };
  const { id } = await deps.insertarPrenda(prenda);
  return { ok: true, prenda_id: id, estado: prenda.estado };
}
