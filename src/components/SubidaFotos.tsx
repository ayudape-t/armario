import { useRef, useState } from 'react';
import { llamarFuncion } from '../lib/api';
import { MENSAJE_SIN_CONEXION, sinConexion } from '../lib/conexion';
import { borrarFotos, prepararFotos, rutaFoto, rutaMini } from '../lib/fotos';
import { supabase } from '../lib/supabase';
import VentanaPremium from './VentanaPremium';

type Estado = 'analizando' | 'lista' | 'sin_clasificar' | 'no_es_prenda' | 'limite' | 'limite_fotos' | 'error' | 'ilegible';
type Item = { clave: string; archivo: File; vista: string; estado: Estado; mensaje?: string };

const TEXTO: Record<Estado, string> = {
  analizando: 'Analizando…',
  lista: 'Lista',
  sin_clasificar: 'Sin clasificar: elige la categoría',
  no_es_prenda: 'No parece una prenda',
  limite: 'Llegaste al límite del plan gratis',
  limite_fotos: 'Llegaste al máximo de 100 fotos por hoy',
  error: 'No se pudo subir la foto',
  ilegible: 'No pudimos leer esta foto',
};

async function subir(uid: string, archivo: File): Promise<{ estado: Estado; mensaje?: string }> {
  let fotos;
  try {
    fotos = await prepararFotos(archivo);
  } catch {
    return { estado: 'ilegible' };
  }
  const ruta = rutaFoto(uid, crypto.randomUUID(), fotos.ext);
  const bucket = supabase.storage.from('prendas');
  const tipo = fotos.ext === 'webp' ? 'image/webp' : 'image/jpeg';
  for (const [r, blob] of [[ruta, fotos.grande], [rutaMini(ruta), fotos.mini]] as const) {
    const { error } = await bucket.upload(r, blob, { contentType: tipo });
    if (error) return { estado: 'error', mensaje: sinConexion(error) ? MENSAJE_SIN_CONEXION : undefined };
  }
  const r = await llamarFuncion<{ estado: 'lista' | 'sin_clasificar' }>('clasificar-prenda', { ruta });
  if (r.ok) return { estado: r.data.estado };
  if (r.error === 'no_es_prenda') return { estado: 'no_es_prenda' };
  await borrarFotos(ruta).catch(() => {});
  if (r.error === 'limite_prendas') return { estado: 'limite' };
  if (r.error === 'limite_fotos') return { estado: 'limite_fotos' };
  return { estado: 'error', mensaje: r.error === 'sin_conexion' ? MENSAJE_SIN_CONEXION : undefined };
}

/** Sube las fotos de una en una (así el límite del plan se respeta foto por foto). */
export default function SubidaFotos({ uid, onCambio }: { uid: string; onCambio?: (listas: number) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const cola = useRef(Promise.resolve());
  const listas = useRef(0);

  function poner(clave: string, cambios: Partial<Item>) {
    setItems((xs) => xs.map((x) => (x.clave === clave ? { ...x, ...cambios } : x)));
  }

  function encolar(item: Item) {
    cola.current = cola.current.then(async () => {
      poner(item.clave, { estado: 'analizando', mensaje: undefined });
      const r = await subir(uid, item.archivo);
      poner(item.clave, r);
      if (r.estado === 'lista' || r.estado === 'sin_clasificar') onCambio?.(++listas.current);
    });
  }

  function elegir(archivos: FileList | null) {
    const nuevos = [...(archivos ?? [])].map((archivo) => ({
      clave: crypto.randomUUID(), archivo, vista: URL.createObjectURL(archivo), estado: 'analizando' as Estado,
    }));
    setItems((xs) => [...nuevos, ...xs]);
    nuevos.forEach(encolar);
  }

  return (
    <div className="subida">
      <label className="boton boton-agregar">
        + Agregar prendas
        <input type="file" accept="image/*" multiple hidden aria-label="Agregar prendas"
          onChange={(e) => { elegir(e.target.files); e.target.value = ''; }} />
      </label>
      {items.length > 0 && (
        <ul className="subidas" aria-label="Fotos subidas">
          {items.map((it) => (
            <li key={it.clave} className={`subida-${it.estado}`}>
              <img src={it.vista} alt="" />
              <span>{it.mensaje ?? TEXTO[it.estado]}</span>
              {it.estado === 'error' && (
                <button type="button" className="secundario" onClick={() => encolar(it)}>
                  Reintentar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {items.some((it) => it.estado === 'limite') && <VentanaPremium motivo="prendas" />}
    </div>
  );
}
