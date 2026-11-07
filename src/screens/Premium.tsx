import { useEffect, useState, type FormEvent } from 'react';
import { MENSAJE_SIN_CONEXION, sinConexion } from '../lib/conexion';
import { mensajeErrorPago, numeroOperacionValido } from '../lib/plan';
import { useSesion } from '../lib/sesion';
import { supabase } from '../lib/supabase';
import { linkWhatsApp } from '../lib/whatsapp';

type Pase = { id: string; nombre: string; dias: number; precio: number };
type Pago = { estado: 'pendiente' | 'aprobado' | 'rechazado'; numero_operacion: string; pase_id: string; monto: number };

const YAPE = import.meta.env.VITE_YAPE_NUMERO ?? '';
const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMERO ?? '';

export default function Premium() {
  const { usuario } = useSesion();
  const [pases, setPases] = useState<Pase[]>([]);
  const [ultimo, setUltimo] = useState<Pago | null>(null);
  const [elegido, setElegido] = useState('1m');
  const [operacion, setOperacion] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function cargar() {
    const [{ data: p }, { data: pago }] = await Promise.all([
      supabase.from('pases').select('id, nombre, dias, precio').order('dias'),
      supabase.from('pagos').select('estado, numero_operacion, pase_id, monto').order('creado_en', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setPases((p as Pase[]) ?? []);
    setUltimo(pago as Pago | null);
  }
  useEffect(() => void cargar(), []);

  const pase = pases.find((p) => p.id === elegido);

  async function pagar(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!numeroOperacionValido(operacion)) return setError('El número de operación tiene solo números (de 6 a 20).');
    setOcupado(true);
    const { error } = await supabase.from('pagos').insert({ pase_id: elegido, numero_operacion: operacion.replace(/\s/g, '') });
    setOcupado(false);
    if (error) return setError(sinConexion(error) ? MENSAJE_SIN_CONEXION : mensajeErrorPago(error.code, error.message));
    setOperacion('');
    void cargar();
  }

  if (ultimo?.estado === 'pendiente') {
    const nombre = pases.find((p) => p.id === ultimo.pase_id)?.nombre ?? '';
    return (
      <section className="premium">
        <h1>En revisión</h1>
        <p>Recibimos tu pago del pase {nombre} (operación {ultimo.numero_operacion}). Lo revisamos y activamos tu Premium lo antes posible.</p>
        {WHATSAPP && (
          <a className="boton" target="_blank" rel="noreferrer"
            href={linkWhatsApp(WHATSAPP, { correo: usuario?.email ?? '', pase: nombre, monto: Number(ultimo.monto), operacion: ultimo.numero_operacion })}>
            Avisar por WhatsApp
          </a>
        )}
      </section>
    );
  }

  return (
    <section className="premium">
      <h1>Premium</h1>
      <ul>
        <li>Prendas sin límite</li>
        <li>Outfits sin límite cada día</li>
      </ul>
      {ultimo?.estado === 'rechazado' && <p className="error" role="alert">Revisa tu número de operación</p>}
      <form onSubmit={pagar}>
        <fieldset className="opciones">
          <legend>Pase</legend>
          {pases.map((p) => (
            <label key={p.id} className="casilla">
              <input type="radio" name="pase" value={p.id} checked={elegido === p.id} onChange={() => setElegido(p.id)} />
              {p.nombre} — S/{Number(p.precio).toFixed(2)}
            </label>
          ))}
        </fieldset>
        {pase && (
          <div className="yape">
            <img src="/yape-qr.png" alt="QR de Yape" width={220} height={220} />
            <p>Yapea <strong>S/{Number(pase.precio).toFixed(2)}</strong> al <strong>{YAPE}</strong> y escribe aquí el número de operación.</p>
          </div>
        )}
        <label>
          Número de operación
          <input inputMode="numeric" maxLength={24} required value={operacion} onChange={(e) => setOperacion(e.target.value)} />
        </label>
        <button type="submit" disabled={ocupado}>Ya pagué</button>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
    </section>
  );
}
