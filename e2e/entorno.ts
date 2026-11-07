import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

// Lee URL y claves del Supabase local (solo pruebas).
const env = Object.fromEntries(
  execSync('npx supabase status -o env', { encoding: 'utf8' })
    .split('\n')
    .map((l) => /^([A-Z_]+)="?(.*?)"?$/.exec(l))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => [m[1], m[2]]),
);
export const SUPABASE_URL: string = env.API_URL;
export const ANON_KEY: string = env.ANON_KEY;
export const SERVICE_KEY: string = env.SERVICE_ROLE_KEY;
export const FUNCIONES = `${SUPABASE_URL}/functions/v1`;

export const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

/** Crea un usuario confirmado y devuelve su id, su token y un cliente con su sesión. */
export async function nuevoUsuario(prefijo = 'cliente') {
  const email = `${prefijo}-${crypto.randomUUID().slice(0, 8)}@prueba.pe`;
  const password = 'clave-de-prueba-123';
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const cliente = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: sesion, error: e2 } = await cliente.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return { id: data.user.id, email, token: sesion.session!.access_token, cliente };
}
