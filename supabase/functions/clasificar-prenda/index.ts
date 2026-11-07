import { procesarClasificacion } from '../_shared/clasificar.ts';
import { clasificarConIA } from '../_shared/claude.ts';
import { admin, json, servir, usuarioDe } from '../_shared/http.ts';

const ESTADO_HTTP = { ruta_invalida: 400, limite_prendas: 403, limite_fotos: 429, no_es_prenda: 422 } as const;

servir(async (req) => {
  const usuario = await usuarioDe(req);
  if (!usuario) return json({ error: 'no_autorizado' }, 401);
  const body = await req.json().catch(() => null);
  if (typeof body?.ruta !== 'string') return json({ error: 'ruta_invalida' }, 400);

  const db = admin();
  const fotos = db.storage.from('prendas');
  const r = await procesarClasificacion(
    {
      async estadoLimites(uid) {
        const { data, error } = await db.rpc('estado_limites', { p_usuario: uid });
        if (error) throw error;
        return data;
      },
      async registrarUso(uid, tipo) {
        const { error } = await db.from('uso_ia').insert({ usuario_id: uid, tipo });
        if (error) throw error;
      },
      async descargarFoto(ruta) {
        const { data, error } = await fotos.download(ruta);
        if (error) throw error;
        return new Uint8Array(await data.arrayBuffer());
      },
      async borrarFotos(ruta) {
        await fotos.remove([ruta, ruta.replace(/\.(\w+)$/, '_mini.$1')]);
      },
      async insertarPrenda(p) {
        const { data, error } = await db.from('prendas').insert(p).select('id').single();
        if (error?.code === '23505') {
          // Dos llamadas con la misma foto a la vez: devolvemos la que ganó.
          const { data: ya, error: e2 } = await db.from('prendas').select('id').eq('foto_path', p.foto_path).single();
          if (e2) throw e2;
          return ya;
        }
        if (error) throw error;
        return data;
      },
      async prendaPorRuta(ruta) {
        const { data, error } = await db.from('prendas').select('id, estado').eq('foto_path', ruta).eq('usuario_id', usuario.id).maybeSingle();
        if (error) throw error;
        return data;
      },
      clasificarConIA,
    },
    usuario.id,
    body.ruta,
  );
  return r.ok ? json({ prenda_id: r.prenda_id, estado: r.estado }) : json({ error: r.error }, ESTADO_HTTP[r.error]);
});
