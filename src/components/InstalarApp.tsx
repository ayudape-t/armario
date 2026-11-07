import { useState } from 'react';

type AvisoInstalar = Event & { prompt(): Promise<void> };
let aviso: AvisoInstalar | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    aviso = e as AvisoInstalar;
  });
}

const CLAVE = 'armario:instalar-visto';
const yaInstalada = () => typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches;
const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** true si todavía no le mostramos la invitación a instalar. */
export function invitarAInstalar(): boolean {
  try {
    return !yaInstalada() && !localStorage.getItem(CLAVE);
  } catch {
    return false;
  }
}

export default function InstalarApp({ onCerrar }: { onCerrar: () => void }) {
  const [hecho, setHecho] = useState(false);
  function cerrar() {
    try {
      localStorage.setItem(CLAVE, '1');
    } catch { /* sin almacenamiento: se volverá a mostrar */ }
    onCerrar();
  }
  if (hecho) return null;
  return (
    <aside className="ventana-premium" aria-label="Instalar la app">
      {aviso ? (
        <>
          <strong>Instala la app en tu celular</strong>
          <button type="button" onClick={async () => { await aviso!.prompt(); setHecho(true); cerrar(); }}>Instalar</button>
        </>
      ) : esIOS() ? (
        <strong>Instala la app en tu celular: Compartir → Agregar a inicio</strong>
      ) : (
        <strong>Instala la app en tu celular desde el menú del navegador: «Instalar app» o «Agregar a la pantalla de inicio».</strong>
      )}
      <button type="button" className="secundario" onClick={cerrar}>Ahora no</button>
    </aside>
  );
}
