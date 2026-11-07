import { supabase } from './supabase';

const BUCKET = 'prendas';

export function medidas(ancho: number, alto: number, max: number): { ancho: number; alto: number } {
  const escala = Math.min(1, max / Math.max(ancho, alto));
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) };
}

// Safari antiguo devuelve PNG cuando se le pide WebP: en ese caso usamos JPEG.
export function formatoSalida(tipoObtenido: string): { tipo: 'image/webp' | 'image/jpeg'; ext: 'webp' | 'jpg' } {
  return tipoObtenido === 'image/webp' ? { tipo: 'image/webp', ext: 'webp' } : { tipo: 'image/jpeg', ext: 'jpg' };
}

export function rutaFoto(uid: string, id: string, ext: string): string {
  return `${uid}/${id}.${ext}`;
}

export function rutaMini(ruta: string): string {
  return ruta.replace(/\.(\w+)$/, '_mini.$1');
}

function aBlob(canvas: HTMLCanvasElement, tipo: string): Promise<Blob> {
  return new Promise((ok, mal) => canvas.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo procesar la foto'))), tipo, 0.8));
}

async function reducir(imagen: ImageBitmap, max: number, tipo: string): Promise<Blob> {
  const { ancho, alto } = medidas(imagen.width, imagen.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext('2d')!.drawImage(imagen, 0, 0, ancho, alto);
  return aBlob(canvas, tipo);
}

export async function prepararFotos(archivo: File): Promise<{ grande: Blob; mini: Blob; ext: 'webp' | 'jpg' }> {
  const imagen = await createImageBitmap(archivo);
  let grande = await reducir(imagen, 1024, 'image/webp');
  const formato = formatoSalida(grande.type);
  if (formato.tipo !== grande.type) grande = await reducir(imagen, 1024, formato.tipo);
  const mini = await reducir(imagen, 300, formato.tipo);
  imagen.close();
  return { grande, mini, ext: formato.ext };
}

export async function urlsFirmadas(rutas: string[]): Promise<Record<string, string>> {
  if (rutas.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(rutas, 3600);
  if (error) throw error;
  const urls: Record<string, string> = {};
  for (const d of data) if (d.path && d.signedUrl) urls[d.path] = d.signedUrl;
  return urls;
}

export async function borrarFotos(ruta: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([ruta, rutaMini(ruta)]);
  if (error) throw error;
}
