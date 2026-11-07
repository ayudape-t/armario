import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router';
import { supabase } from '../lib/supabase';

type Pendiente = { id: string; correo: string; pase: string; monto: number; numero_operacion: string; creado_en: string };

const hora = (iso: string) =>
  new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const MENSAJES: Record<string, string> = {
  'el pago ya fue revisado': 'Ese pago ya fue revisado.',
  'cliente no encontrado': 'No existe una cuenta con ese correo.',
  'días fuera de rango': 'Los días deben ser de 1 a 365.',
};
const mensaje = (e: { message: string }) => MENSAJES[e.message] ?? 'No se pudo completar. Inténtalo de nuevo.';

export default function Admin() {
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null);
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const [correo, setCorreo] = useState('');
  const [dias, setDias] = useState(30);

  const cargar = useCallback(async () => {
    const { data } = await supabase.rpc('pagos_pendientes');
    setPendientes((data as Pendiente[]) ?? []);
  }, []);

  useEffect(() => {
    supabase.rpc('es_admin').then(({ data }) => {
      setEsAdmin(data === true);
      if (data === true) void cargar();
    });
  }, [cargar]);

  if (esAdmin === null) return <p className="cargando">Cargando…</p>;
  if (!esAdmin) return <Navigate to="/" replace />;

  async function revisar(id: string, accion: 'aprobar_pago' | 'rechazar_pago') {
    setOcupado(id);
    const { error } = await supabase.rpc(accion, { p_pago: id });
    setOcupado(null);
    setAviso(error ? mensaje(error) : accion === 'aprobar_pago' ? 'Pago aprobado: Premium activado.' : 'Pago rechazado.');
    void cargar();
  }

  async function regalar(e: FormEvent) {
    e.preventDefault();
    setOcupado('regalo');
    const { error } = await supabase.rpc('regalar_premium', { p_correo: correo, p_dias: dias });
    setOcupado(null);
    setAviso(error ? mensaje(error) : `Listo: ${dias} días de Premium para ${correo}.`);
    if (!error) setCorreo('');
  }

  return (
    <section className="admin">
      <h1>Administrador</h1>
      {aviso && <p className="aviso" role="status">{aviso}</p>}

      <h2>Pagos en revisión</h2>
      {pendientes.length === 0 ? (
        <p className="cargando">No hay pagos pendientes.</p>
      ) : (
        <div className="tabla">
          <table>
            <thead>
              <tr><th>Cliente</th><th>Pase</th><th>Monto</th><th>Operación</th><th>Fecha</th><th /></tr>
            </thead>
            <tbody>
              {pendientes.map((p) => (
                <tr key={p.id}>
                  <td>{p.correo}</td>
                  <td>{p.pase}</td>
                  <td>S/{Number(p.monto).toFixed(2)}</td>
                  <td>{p.numero_operacion}</td>
                  <td>{hora(p.creado_en)}</td>
                  <td className="acciones-outfit">
                    <button type="button" disabled={ocupado === p.id} onClick={() => revisar(p.id, 'aprobar_pago')}>Aprobar</button>
                    <button type="button" className="secundario" disabled={ocupado === p.id} onClick={() => revisar(p.id, 'rechazar_pago')}>Rechazar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Regalar Premium</h2>
      <form onSubmit={regalar}>
        <label>
          Correo del cliente
          <input type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </label>
        <label>
          Días
          <input type="number" min={1} max={365} required value={dias} onChange={(e) => setDias(Number(e.target.value))} />
        </label>
        <button type="submit" disabled={ocupado === 'regalo'}>Regalar</button>
      </form>
    </section>
  );
}
