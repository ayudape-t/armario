import { z } from 'zod';

import { CALIDECES, CATEGORIAS, FORMALIDADES, PALETA } from './catalogo.ts';

export { CALIDECES, CATEGORIAS, FORMALIDADES, PALETA };

// Sin límites de largo/cantidad en el esquema: recortamos al guardar en vez de perder la clasificación.
export const FichaIA = z.object({
  es_prenda: z.boolean(),
  categoria: z.enum(CATEGORIAS),
  tipo: z.string(),
  colores: z.array(z.enum(PALETA)),
  formalidad: z.enum(FORMALIDADES),
  calidez: z.enum(CALIDECES),
});
export type Ficha = z.infer<typeof FichaIA>;
