import { borrarCuenta } from '../_shared/borrar.ts';
import { admin, json, servir, usuarioDe } from '../_shared/http.ts';

servir(async (req) => {
  const usuario = await usuarioDe(req);
  if (!usuario) return json({ error: 'no_autorizado' }, 401);

  const db = admin();
  const fotos = db.storage.from('prendas');
  await borrarCuenta(
    {
      async listarFotos(uid, offset) {
        const { data, error } = await fotos.list(uid, { limit: 1000, offset });
        if (error) throw error;
        return data.map((f) => `${uid}/${f.name}`);
      },
      async borrarRutas(rutas) {
        const { error } = await fotos.remove(rutas);
        if (error) throw error;
      },
      async borrarUsuario(uid) {
        const { error } = await db.auth.admin.deleteUser(uid);
        if (error) throw error;
      },
    },
    usuario.id,
  );
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
});
