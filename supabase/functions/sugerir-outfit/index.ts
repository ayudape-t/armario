import { sugerirConIA } from '../_shared/claude.ts';
import { admin, json, servir, usuarioDe } from '../_shared/http.ts';
import { procesarPedidoOutfit } from '../_shared/outfit.ts';

const ESTADO_HTTP = { pedido_invalido: 400, limite_outfits: 403, sin_prendas: 200, fuera_de_tema: 200, fallo_ia: 502 } as const;

servir(async (req) => {
  const usuario = await usuarioDe(req);
  if (!usuario) return json({ error: 'no_autorizado' }, 401);
  const body = await req.json().catch(() => null);

  const db = admin();
  const r = await procesarPedidoOutfit(
    {
      async estadoLimites(uid) {
        const { data, error } = await db.rpc('estado_limites', { p_usuario: uid });
        if (error) throw error;
        return data;
      },
      async prendasListas(uid) {
        const { data, error } = await db
          .from('prendas')
          .select('id, categoria, tipo, colores, formalidad, calidez')
          .eq('usuario_id', uid)
          .eq('estado', 'lista')
          .order('creado_en');
        if (error) throw error;
        return data;
      },
      async registrarUso(uid, tipo) {
        const { error } = await db.from('uso_ia').insert({ usuario_id: uid, tipo });
        if (error) throw error;
      },
      sugerirConIA,
    },
    usuario.id,
    body,
  );
  return r.ok ? json({ outfits: r.outfits, faltan: r.faltan }) : json({ error: r.error }, ESTADO_HTTP[r.error]);
});
