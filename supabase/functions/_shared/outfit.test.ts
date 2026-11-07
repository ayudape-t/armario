import { describe, expect, test, vi } from 'vitest';
import { armarLista, procesarPedidoOutfit, type DepsOutfit, type PrendaLista, type RespuestaIA } from './outfit.ts';

const UID = 'u1';
const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const PRENDAS: PrendaLista[] = [1, 2, 3, 4].map((n) => ({
  id: id(n), categoria: n === 1 ? 'vestido' : 'calzado', tipo: n === 1 ? 'vestido largo' : null,
  colores: ['negro'], formalidad: 'informal', calidez: 'ligera',
}));
const PEDIDO = { ocasion: 'fiesta de noche', tema: '', formalidad: 'informal', colores: 'llamativos', clima: 'frio' };
const BUENA: RespuestaIA = {
  fuera_de_tema: false, faltan: null,
  outfits: [
    { titulo: 'Uno', frase: 'a', prendas: ['p1', 'p2'] },
    { titulo: 'Dos', frase: 'b', prendas: ['p1', 'p3'] },
    { titulo: 'Tres', frase: 'c', prendas: ['p1', 'p4'] },
  ],
};

function deps(cambios: Partial<DepsOutfit> = {}): DepsOutfit {
  return {
    estadoLimites: vi.fn(async () => ({ outfits_hoy: 0, max_outfits: 3 })),
    prendasListas: vi.fn(async () => PRENDAS),
    registrarUso: vi.fn(async () => {}),
    sugerirConIA: vi.fn(async () => BUENA),
    ...cambios,
  };
}

describe('procesarPedidoOutfit', () => {
  test('rechaza pedidos inválidos', async () => {
    for (const malo of [{ ...PEDIDO, ocasion: 'x'.repeat(81) }, { ...PEDIDO, clima: 'nieve' }, { ...PEDIDO, colores: undefined }, null]) {
      expect(await procesarPedidoOutfit(deps(), UID, malo)).toEqual({ ok: false, error: 'pedido_invalido' });
    }
  });

  test('con el límite del día alcanzado no llama a la IA', async () => {
    const d = deps({ estadoLimites: vi.fn(async () => ({ outfits_hoy: 3, max_outfits: 3 })) });
    expect(await procesarPedidoOutfit(d, UID, PEDIDO)).toEqual({ ok: false, error: 'limite_outfits' });
    expect(d.sugerirConIA).not.toHaveBeenCalled();
  });

  test('sin prendas clasificadas avisa sin gastar IA ni pedido', async () => {
    for (const lista of [[], PRENDAS.slice(0, 1)]) {
      const d = deps({ prendasListas: vi.fn(async () => lista) });
      expect(await procesarPedidoOutfit(d, UID, PEDIDO)).toEqual({ ok: false, error: 'sin_prendas' });
      expect(d.sugerirConIA).not.toHaveBeenCalled();
      expect(d.registrarUso).not.toHaveBeenCalled();
    }
  });

  test('descarta outfits con prendas inventadas o de tamaño inválido', async () => {
    const ocho = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ ...PRENDAS[1], id: id(n) }));
    const d = deps({ prendasListas: vi.fn(async () => ocho), sugerirConIA: vi.fn(async () => ({
      fuera_de_tema: false, faltan: null,
      outfits: [
        { titulo: 'Inventado', frase: 'x', prendas: ['p1', 'p99'] },
        { titulo: 'Solo uno', frase: 'x', prendas: ['p1'] },
        { titulo: 'Siete', frase: 'x', prendas: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] },
        { titulo: 'Bueno', frase: 'y', prendas: ['p1', 'p2'] },
      ],
    })) });
    const r = await procesarPedidoOutfit(d, UID, PEDIDO);
    expect(r).toEqual({ ok: true, faltan: null, outfits: [{ titulo: 'Bueno', frase: 'y', prendas: [id(1), id(2)] }] });
  });

  test('recorta títulos y frases largas en vez de fallar', async () => {
    const d = deps({ sugerirConIA: vi.fn(async () => ({
      fuera_de_tema: false, faltan: null, outfits: [{ titulo: 't'.repeat(90), frase: 'f'.repeat(300), prendas: ['p1', 'p2'] }],
    })) });
    const r = await procesarPedidoOutfit(d, UID, PEDIDO);
    expect(r.ok && r.outfits[0].titulo.length).toBe(60);
    expect(r.ok && r.outfits[0].frase.length).toBe(200);
  });

  test('reintenta una vez si la primera respuesta no sirve y cuenta un solo pedido', async () => {
    const vacia: RespuestaIA = { fuera_de_tema: false, faltan: null, outfits: [{ titulo: 'x', frase: 'x', prendas: ['p77', 'p78'] }] };
    const d = deps({ sugerirConIA: vi.fn().mockResolvedValueOnce(vacia).mockResolvedValueOnce(BUENA) });
    const r = await procesarPedidoOutfit(d, UID, PEDIDO);
    expect(r.ok && r.outfits.length).toBe(3);
    expect(d.sugerirConIA).toHaveBeenCalledTimes(2);
    expect(d.registrarUso).toHaveBeenCalledTimes(1);
  });

  test('si falla dos veces no descuenta el pedido', async () => {
    const vacia: RespuestaIA = { fuera_de_tema: false, faltan: null, outfits: [] };
    for (const ia of [vi.fn(async () => vacia), vi.fn(async () => { throw new Error('caída'); })]) {
      const d = deps({ sugerirConIA: ia });
      expect(await procesarPedidoOutfit(d, UID, PEDIDO)).toEqual({ ok: false, error: 'fallo_ia' });
      expect(ia).toHaveBeenCalledTimes(2);
      expect(d.registrarUso).not.toHaveBeenCalled();
    }
  });

  test('un pedido fuera de tema se responde y cuenta', async () => {
    const d = deps({ sugerirConIA: vi.fn(async () => ({ fuera_de_tema: true, faltan: null, outfits: [] })) });
    expect(await procesarPedidoOutfit(d, UID, { ...PEDIDO, ocasion: 'hazme la tarea' })).toEqual({ ok: false, error: 'fuera_de_tema' });
    expect(d.registrarUso).toHaveBeenCalledWith(UID, 'outfit');
  });

  test('si faltan prendas para la ocasión lo explica y cuenta', async () => {
    const d = deps({ sugerirConIA: vi.fn(async () => ({ fuera_de_tema: false, faltan: 'No tienes abrigos', outfits: [] })) });
    expect(await procesarPedidoOutfit(d, UID, PEDIDO)).toEqual({ ok: true, outfits: [], faltan: 'No tienes abrigos' });
    expect(d.registrarUso).toHaveBeenCalledTimes(1);
  });

  test('traduce los outfits a evitar a códigos antes de llamar a la IA', async () => {
    const d = deps();
    await procesarPedidoOutfit(d, UID, { ...PEDIDO, evitar: [[id(1), id(2)], [id(9)]] });
    expect(d.sugerirConIA).toHaveBeenCalledWith(expect.objectContaining({ ocasion: 'fiesta de noche' }), expect.any(String), [['p1', 'p2'], []]);
  });
});

test('armarLista escribe una línea por prenda con su código', () => {
  const { texto, codigoAId } = armarLista(PRENDAS.slice(0, 2));
  expect(texto).toBe('p1 · vestido (vestido largo) · negro · informal · ligera\np2 · calzado · negro · informal · ligera');
  expect(codigoAId.get('p2')).toBe(id(2));
});
