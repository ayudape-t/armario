import { z } from 'zod';

export const CATEGORIAS = ['arriba', 'abajo', 'vestido', 'calzado', 'abrigo', 'accesorio'] as const;
export const PALETA = [
  'negro', 'blanco', 'gris', 'beige', 'marrón', 'azul marino', 'azul', 'celeste', 'verde',
  'rojo', 'rosado', 'morado', 'amarillo', 'naranja', 'dorado', 'plateado', 'estampado',
] as const;
export const FORMALIDADES = ['formal', 'informal', 'ambas'] as const;
export const CALIDECES = ['ligera', 'media', 'abrigada'] as const;

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
