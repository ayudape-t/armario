import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { estadoLimites, llamarFuncion, type EstadoLimites } from '../lib/api';
import { MENSAJE_SIN_CONEXION } from '../lib/conexion';
import { hoyLima } from '../lib/fechas';
import { useSesion } from '../lib/sesion';
import { supabase } from '../lib/supabase';

const fecha = (iso: string) => hoyLima(new Date(iso)).split('-').reverse().join('/');

export default function Cuenta() {
  const { usuario } = useSesion();
  const navegar = useNavigate();
  const [limites, setLimites] = useState<EstadoLimites | null>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    estadoLimites().then(setLimites).catch(() => setError(MENSAJE_SIN_CONEXION));
    supabase.rpc('es_admin').then(({ data }) => setEsAdmin(data === true));
  }, []);

  async function salir() {
    await supabase.auth.signOut();
    navegar('/entrar', { replace: true });
  }

  async function borrarCuenta() {
    setOcupado(true);
    const r = await llamarFuncion('borrar-cuenta');
    setOcupado(false);
    if (!r.ok) return setError(r.error === 'sin_conexion' ? MENSAJE_SIN_CONEXION : 'No pudimos borrar tu cuenta. Inténtalo de nuevo.');
    await salir();
  }

  return (
    <section className="cuenta">
      <h1>Cuenta</h1>
      <p>{usuario?.email}</p>
      {limites && (
        <div className="tarjeta-outfit">
          {limites.premium ? (
            <>
              <strong>{limites.en_prueba ? 'Prueba gratis de Premium' : 'Premium'}</strong>
              <span>Vence el {fecha(limites.premium_hasta!)}</span>
              <span>Prendas y outfits sin límite</span>
              <Link to="/premium">Renovar Premium</Link>
            </>
          ) : (
            <>
              <strong>Plan gratis</strong>
              <span>{limites.outfits_hoy} de {limites.max_outfits} outfits hoy</span>
              <span>{limites.prendas} de {limites.max_prendas} prendas</span>
              <Link className="boton" to="/premium">Pasar a Premium</Link>
            </>
          )}
        </div>
      )}
      {esAdmin && <Link to="/admin">Panel de administrador</Link>}
      <button type="button" className="secundario" onClick={salir}>Cerrar sesión</button>

      <details className="borrar-cuenta">
        <summary>Borrar cuenta</summary>
        <p>Se borran tus prendas, fotos, outfits, agenda y pagos. No se puede deshacer.</p>
        <label>
          Escribe BORRAR para confirmar
          <input value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
        </label>
        <button type="button" className="peligro" disabled={confirmar !== 'BORRAR' || ocupado} onClick={borrarCuenta}>
          Borrar mi cuenta
        </button>
      </details>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
