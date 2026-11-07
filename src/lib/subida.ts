import { llamarFuncion, type RespuestaFuncion } from './api';
import { MENSAJE_SIN_CONEXION, sinConexion } from './conexion';
import { borrarFotos, prepararFotos, rutaFoto, rutaMini } from './fotos';
import { supabase } from './supabase';

export type EstadoSubida = 'analizando' | 'lista' | 'sin_clasificar' | 'no_es_prenda' | 'limite' | 'limite_fotos' | 'error' | 'ilegible';
/** `ruta` viene cuando la foto ya está subida y conviene reintentar solo la clasificación. */
export type ResultadoSubida = { estado: EstadoSubida; mensaje?: string; ruta?: string };

export type DepsSubida = {
  preparar(archivo: File): Promise<{ grande: Blob; mini: Blob; ext: 'webp' | 'jpg' }>;
  subirArchivo(ruta: string, blob: Blob, tipo: string): Promise<{ error: unknown }>;
  clasificar(ruta: string): Promise<RespuestaFuncion<{ estado: 'lista' | 'sin_clasificar' }>>;
  borrar(ruta: string): Promise<void>;
  nuevoId(): string;
};

export const depsReales: DepsSubida = {
  preparar: prepararFotos,
  subirArchivo: (ruta, blob, tipo) => supabase.storage.from('prendas').upload(ruta, blob, { contentType: tipo }),
  clasificar: (ruta) => llamarFuncion('clasificar-prenda', { ruta }),
  borrar: borrarFotos,
  nuevoId: () => crypto.randomUUID(),
};

export async function subirPrenda(deps: DepsSubida, uid: string, archivo: File, rutaPrevia?: string): Promise<ResultadoSubida> {
  let ruta = rutaPrevia;
  if (!ruta) {
    let fotos;
    try {
      fotos = await deps.preparar(archivo);
    } catch {
      return { estado: 'ilegible' };
    }
    const nueva = rutaFoto(uid, deps.nuevoId(), fotos.ext);
    const tipo = fotos.ext === 'webp' ? 'image/webp' : 'image/jpeg';
    for (const [r, blob] of [[nueva, fotos.grande], [rutaMini(nueva), fotos.mini]] as const) {
      const { error } = await deps.subirArchivo(r, blob, tipo);
      if (error) {
        await deps.borrar(nueva).catch(() => {});
        return { estado: 'error', mensaje: sinConexion(error) ? MENSAJE_SIN_CONEXION : undefined };
      }
    }
    ruta = nueva;
  }

  const r = await deps.clasificar(ruta);
  if (r.ok) return { estado: r.data.estado };
  if (r.error === 'no_es_prenda') return { estado: 'no_es_prenda' };
  if (r.error === 'limite_prendas' || r.error === 'limite_fotos') {
    await deps.borrar(ruta).catch(() => {});
    return { estado: r.error === 'limite_prendas' ? 'limite' : 'limite_fotos' };
  }
  // No sabemos si el servidor alcanzó a guardar la prenda: conservamos las fotos y reintentamos con la misma ruta.
  return { estado: 'error', mensaje: r.error === 'sin_conexion' ? MENSAJE_SIN_CONEXION : undefined, ruta };
}
