import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

type Funcion = 'clasificar-prenda' | 'sugerir-outfit' | 'borrar-cuenta';
export type RespuestaFuncion<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

export async function llamarFuncion<T>(nombre: Funcion, body?: unknown): Promise<RespuestaFuncion<T>> {
  const { data, error } = await supabase.functions.invoke(nombre, { body: body ?? {} });
  if (!error) return { ok: true, data: data as T };
  if (error instanceof FunctionsHttpError) {
    const respuesta = error.context as Response;
    const cuerpo = await respuesta.json().catch(() => ({}));
    return { ok: false, error: cuerpo.error ?? 'error_interno', status: respuesta.status };
  }
  if (error instanceof FunctionsFetchError) return { ok: false, error: 'sin_conexion', status: 0 };
  return { ok: false, error: 'error_interno', status: 0 };
}

/** Mismas claves que la función estado_limites de la base de datos. */
export type EstadoLimites = {
  premium: boolean;
  en_prueba: boolean;
  premium_hasta: string | null;
  prendas: number;
  max_prendas: number;
  outfits_hoy: number;
  max_outfits: number;
  clasificaciones_hoy: number;
  max_clasificaciones: number;
};

export async function estadoLimites(): Promise<EstadoLimites> {
  const { data, error } = await supabase.rpc('estado_limites');
  if (error) throw error;
  return data as EstadoLimites;
}
