import { z } from 'zod';

// El razonamiento adaptativo de la IA cuenta dentro de max_tokens: con poco margen, un armario grande corta la respuesta.
export const MAX_TOKENS_OUTFIT = 16_000;

export const Pedido = z.object({
  ocasion: z.string().trim().min(1).max(80),
  tema: z.string().trim().max(80).default(''),
  formalidad: z.enum(['formal', 'informal']),
  colores: z.enum(['neutros', 'llamativos', 'da_igual']),
  clima: z.enum(['frio', 'templado', 'calor', 'lluvia']),
  evitar: z.array(z.array(z.guid())).max(10).optional(),
});
export type Pedido = z.infer<typeof Pedido>;

// Sin límites de largo en el esquema: la IA a veces se pasa y preferimos recortar a fallar.
export const RespuestaIA = z.object({
  fuera_de_tema: z.boolean(),
  faltan: z.string().nullable(),
  outfits: z.array(z.object({ titulo: z.string(), frase: z.string(), prendas: z.array(z.string()) })),
});
export type RespuestaIA = z.infer<typeof RespuestaIA>;

export type PrendaLista = {
  id: string;
  categoria: string;
  tipo: string | null;
  colores: string[] | null;
  formalidad: string | null;
  calidez: string | null;
};
export type OutfitValido = { titulo: string; frase: string; prendas: string[] };

export type DepsOutfit = {
  estadoLimites(uid: string): Promise<{ outfits_hoy: number; max_outfits: number }>;
  prendasListas(uid: string): Promise<PrendaLista[]>;
  registrarUso(uid: string, tipo: 'outfit'): Promise<void>;
  sugerirConIA(pedido: Pedido, lista: string, evitarCodigos: string[][]): Promise<RespuestaIA>;
};

export type ResultadoOutfit =
  | { ok: true; outfits: OutfitValido[]; faltan: string | null }
  | { ok: false; error: 'pedido_invalido' | 'limite_outfits' | 'sin_prendas' | 'fuera_de_tema' | 'fallo_ia' };

export function armarLista(prendas: PrendaLista[]): { texto: string; codigoAId: Map<string, string> } {
  const codigoAId = new Map<string, string>();
  const lineas = prendas.map((p, i) => {
    const codigo = `p${i + 1}`;
    codigoAId.set(codigo, p.id);
    const nombre = p.tipo && p.tipo !== p.categoria ? `${p.categoria} (${p.tipo})` : p.categoria;
    return [codigo, nombre, p.colores?.join(', ') ?? '—', p.formalidad ?? '—', p.calidez ?? '—'].join(' · ');
  });
  return { texto: lineas.join('\n'), codigoAId };
}

export function validarOutfits(r: RespuestaIA, codigoAId: Map<string, string>): OutfitValido[] {
  return r.outfits
    .map((o) => ({ ...o, prendas: [...new Set(o.prendas)] }))
    .filter((o) => o.prendas.length >= 2 && o.prendas.length <= 6 && o.prendas.every((c) => codigoAId.has(c)))
    .slice(0, 3)
    .map((o) => ({ titulo: o.titulo.slice(0, 60), frase: o.frase.slice(0, 200), prendas: o.prendas.map((c) => codigoAId.get(c)!) }));
}

export async function procesarPedidoOutfit(deps: DepsOutfit, uid: string, body: unknown): Promise<ResultadoOutfit> {
  const pedido = Pedido.safeParse(body);
  if (!pedido.success) return { ok: false, error: 'pedido_invalido' };

  const limites = await deps.estadoLimites(uid);
  if (limites.outfits_hoy >= limites.max_outfits) return { ok: false, error: 'limite_outfits' };

  const prendas = await deps.prendasListas(uid);
  if (prendas.length < 2) return { ok: false, error: 'sin_prendas' };

  const { texto, codigoAId } = armarLista(prendas);
  const idACodigo = new Map([...codigoAId].map(([c, i]) => [i, c]));
  const evitar = (pedido.data.evitar ?? []).map((l) => l.flatMap((i) => idACodigo.get(i) ?? []));

  for (let intento = 0; intento < 2; intento++) {
    let r: RespuestaIA;
    try {
      r = await deps.sugerirConIA(pedido.data, texto, evitar);
    } catch {
      continue;
    }
    if (r.fuera_de_tema) {
      await deps.registrarUso(uid, 'outfit');
      return { ok: false, error: 'fuera_de_tema' };
    }
    const outfits = validarOutfits(r, codigoAId);
    if (outfits.length > 0 || r.faltan) {
      await deps.registrarUso(uid, 'outfit');
      return { ok: true, outfits, faltan: r.faltan };
    }
  }
  return { ok: false, error: 'fallo_ia' };
}
