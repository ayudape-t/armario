import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function cors(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: CORS }) : null;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

export function admin(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

export async function usuarioDe(req: Request): Promise<{ id: string; email: string } | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await admin().auth.getUser(token);
  return data.user ? { id: data.user.id, email: data.user.email ?? '' } : null;
}

/** Ejecuta el manejador y convierte cualquier error inesperado en un 500 registrado. */
export function servir(manejador: (req: Request) => Promise<Response>): void {
  Deno.serve(async (req) => {
    const previa = cors(req);
    if (previa) return previa;
    try {
      return await manejador(req);
    } catch (e) {
      console.error(e);
      return json({ error: 'error_interno' }, 500);
    }
  });
}
