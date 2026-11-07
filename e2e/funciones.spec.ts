import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { admin, ANON_KEY, FUNCIONES, nuevoUsuario } from './entorno';

const VESTIDO = readFileSync('e2e/fixtures/vestido.webp');

async function subirFoto(u: Awaited<ReturnType<typeof nuevoUsuario>>) {
  const ruta = `${u.id}/${crypto.randomUUID()}.webp`;
  const { error } = await u.cliente.storage.from('prendas').upload(ruta, VESTIDO, { contentType: 'image/webp' });
  if (error) throw error;
  return ruta;
}

function llamar(nombre: string, token: string | null, body: unknown) {
  return fetch(`${FUNCIONES}/${nombre}`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
}

test.describe('clasificar-prenda', () => {
  test('con la IA respondiendo, la prenda queda lista y clasificada', async () => {
    test.skip(process.env.IA_APAGADA === '1');
    const u = await nuevoUsuario();
    const r = await llamar('clasificar-prenda', u.token, { ruta: await subirFoto(u) });
    expect(r.status).toBe(200);
    const cuerpo = await r.json();
    expect(cuerpo.estado).toBe('lista');
    const { data } = await admin.from('prendas').select('categoria').eq('id', cuerpo.prenda_id).single();
    expect(data?.categoria).toBe('vestido');
  });

  test('con la IA caída, la prenda queda sin clasificar', async () => {
    test.skip(process.env.IA_APAGADA !== '1');
    const u = await nuevoUsuario();
    const r = await llamar('clasificar-prenda', u.token, { ruta: await subirFoto(u) });
    expect(r.status).toBe(200);
    expect((await r.json()).estado).toBe('sin_clasificar');
  });

  test('sin sesión responde 401', async () => {
    const r = await llamar('clasificar-prenda', null, { ruta: 'x/y.webp' });
    expect(r.status).toBe(401);
  });
});

test.describe('sugerir-outfit', () => {
  test('arma outfits solo con prendas del cliente', async () => {
    test.skip(process.env.IA_APAGADA === '1');
    const u = await nuevoUsuario();
    const { data: prendas, error } = await admin.from('prendas').insert([
      { usuario_id: u.id, foto_path: `${u.id}/a.webp`, estado: 'lista', categoria: 'vestido', colores: ['negro'] },
      { usuario_id: u.id, foto_path: `${u.id}/b.webp`, estado: 'lista', categoria: 'calzado', colores: ['dorado'] },
    ]).select('id');
    if (error) throw error;
    const r = await llamar('sugerir-outfit', u.token, { ocasion: 'fiesta de noche', formalidad: 'informal', colores: 'llamativos', clima: 'frio' });
    expect(r.status).toBe(200);
    const cuerpo = await r.json();
    expect(cuerpo.outfits.length).toBeGreaterThan(0);
    const mias = new Set(prendas!.map((p) => p.id));
    for (const o of cuerpo.outfits) for (const p of o.prendas) expect(mias.has(p)).toBe(true);
  });

  test('un pedido inválido responde 400', async () => {
    const u = await nuevoUsuario();
    const r = await llamar('sugerir-outfit', u.token, { ocasion: '', formalidad: 'informal', colores: 'neutros', clima: 'nieve' });
    expect(r.status).toBe(400);
  });
});
