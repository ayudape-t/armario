import { useRef, useState } from 'react';
import { depsReales, subirPrenda, type EstadoSubida as Estado } from '../lib/subida';
import VentanaPremium from './VentanaPremium';

type Item = { clave: string; archivo: File; vista: string; estado: Estado; mensaje?: string; ruta?: string };

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

/** Sube las fotos de una en una (así el límite del plan se respeta foto por foto). */
export default function SubidaFotos({ uid, onCambio }: { uid: string; onCambio?: (listas: number) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const cola = useRef(Promise.resolve());
  const listas = useRef(0);

  function poner(clave: string, cambios: Partial<Item>) {
    setItems((xs) => xs.map((x) => (x.clave === clave ? { ...x, ...cambios } : x)));
  }

  function encolar(item: Item) {
    poner(item.clave, { estado: 'analizando', mensaje: undefined });
    cola.current = cola.current.then(async () => {
      const r = await subirPrenda(depsReales, uid, item.archivo, item.ruta);
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
