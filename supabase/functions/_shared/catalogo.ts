// Valores fijos del spec (§4.1, §5.1), compartidos por la app y las funciones. Sin dependencias.
export const CATEGORIAS = ['arriba', 'abajo', 'vestido', 'calzado', 'abrigo', 'accesorio'] as const;
export const PALETA = [
  'negro', 'blanco', 'gris', 'beige', 'marrón', 'azul marino', 'azul', 'celeste', 'verde',
  'rojo', 'rosado', 'morado', 'amarillo', 'naranja', 'dorado', 'plateado', 'estampado',
] as const;
export const FORMALIDADES = ['formal', 'informal', 'ambas'] as const;
export const CALIDECES = ['ligera', 'media', 'abrigada'] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export const NOMBRE_CATEGORIA: Record<Categoria, string> = {
  arriba: 'Partes de arriba',
  abajo: 'Partes de abajo',
  vestido: 'Vestidos',
  calzado: 'Calzado',
  abrigo: 'Abrigos',
  accesorio: 'Accesorios',
};
