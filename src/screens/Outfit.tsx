import { useCallback, useEffect, useState, type FormEvent } from 'react';
import InstalarApp, { invitarAInstalar } from '../components/InstalarApp';
import TarjetaOutfit from '../components/TarjetaOutfit';
import VentanaPremium from '../components/VentanaPremium';
import { estadoLimites, llamarFuncion, type EstadoLimites } from '../lib/api';
import { MENSAJE_SIN_CONEXION } from '../lib/conexion';
import { hoyLima, nombreDia, semana } from '../lib/fechas';
import { useMinisPorPrenda } from '../lib/prendasFotos';
import { useSesion } from '../lib/sesion';
import { supabase } from '../lib/supabase';

type Sugerido = { titulo: string; frase: string; prendas: string[]; guardadoId?: string; planificado?: string; dia: string };
type Guardado = { id: string; titulo: string; frase: string; outfit_prendas: { prenda_id: string }[] };

const OCASIONES = ['trabajo', 'casual', 'fiesta de noche', 'cita', 'matrimonio', 'deporte', 'viaje'];
const MENSAJES: Record<string, string> = {
  sin_prendas: 'Agrega prendas para armar outfits',
  fuera_de_tema: 'Solo puedo armar outfits',
  fallo_ia: 'No pudimos armar tus outfits, inténtalo de nuevo',
  sin_conexion: MENSAJE_SIN_CONEXION,
};
const mayuscula = (s: string) => s[0].toUpperCase() + s.slice(1);

function Opciones({ nombre, valor, opciones, onCambio }: { nombre: string; valor: string; opciones: [string, string][]; onCambio: (v: string) => void }) {
  return (
    <fieldset className="opciones">
      <legend>{nombre}</legend>
      {opciones.map(([v, etiqueta]) => (
        <label key={v} className="casilla">
          <input type="radio" name={nombre} value={v} checked={valor === v} onChange={() => onCambio(v)} />
          {etiqueta}
        </label>
      ))}
    </fieldset>
  );
}

export default function Outfit() {
  const { usuario } = useSesion();
  const fotos = useMinisPorPrenda();
  const hoy = hoyLima();
  const [ocasion, setOcasion] = useState('');
  const [otra, setOtra] = useState('');
  const [tema, setTema] = useState('');
  const [formalidad, setFormalidad] = useState('informal');
  const [colores, setColores] = useState('da_igual');
  const [clima, setClima] = useState('templado');
  const [sugeridos, setSugeridos] = useState<Sugerido[]>([]);
  const [vistos, setVistos] = useState<string[][]>([]);
  const [faltan, setFaltan] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [limite, setLimite] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [limites, setLimites] = useState<EstadoLimites | null>(null);
  const [guardados, setGuardados] = useState<Guardado[]>([]);
  const [instalar, setInstalar] = useState(false);

  const cargarGuardados = useCallback(async () => {
    const { data } = await supabase.from('outfits').select('id, titulo, frase, outfit_prendas(prenda_id)').order('creado_en', { ascending: false });
    setGuardados((data as Guardado[]) ?? []);
  }, []);

  useEffect(() => {
    estadoLimites().then(setLimites).catch(() => {});
    void cargarGuardados();
  }, [cargarGuardados]);

  async function pedir(evitar: string[][]) {
    setOcupado(true);
    setMensaje('');
    setLimite(false);
    const r = await llamarFuncion<{ outfits: Omit<Sugerido, 'dia'>[]; faltan: string | null }>('sugerir-outfit', {
      ocasion: ocasion === 'otra' ? otra : ocasion, tema, formalidad, colores, clima, ...(evitar.length ? { evitar: evitar.slice(-10) } : {}),
    });
    setOcupado(false);
    estadoLimites().then(setLimites).catch(() => {});
    if (!r.ok) {
      if (r.error === 'limite_outfits') setLimite(true);
      else setMensaje(MENSAJES[r.error] ?? MENSAJES.fallo_ia);
      return;
    }
    setSugeridos(r.data.outfits.map((o) => ({ ...o, dia: hoy })));
    setVistos([...evitar, ...r.data.outfits.map((o) => o.prendas)]);
    setFaltan(r.data.faltan);
  }

  const cambiar = (i: number, c: Partial<Sugerido>) => setSugeridos((xs) => xs.map((x, j) => (j === i ? { ...x, ...c } : x)));

  async function guardar(i: number): Promise<string | null> {
    const o = sugeridos[i];
    if (o.guardadoId) return o.guardadoId;
    const { data, error } = await supabase.rpc('guardar_outfit', { p_titulo: o.titulo, p_frase: o.frase, p_prendas: o.prendas });
    if (error) {
      setMensaje('No pudimos guardar el outfit. Inténtalo de nuevo.');
      return null;
    }
    cambiar(i, { guardadoId: data as string });
    if (guardados.length === 0 && invitarAInstalar()) setInstalar(true);
    void cargarGuardados();
    return data as string;
  }

  async function planificar(i: number) {
    const id = await guardar(i);
    if (!id) return;
    const fecha = sugeridos[i].dia;
    const { error } = await supabase.from('agenda').upsert({ usuario_id: usuario!.id, fecha, outfit_id: id }, { onConflict: 'usuario_id,fecha' });
    if (error) setMensaje('No pudimos planificarlo. Inténtalo de nuevo.');
    else cambiar(i, { planificado: fecha });
  }

  async function borrarGuardado(id: string) {
    await supabase.from('outfits').delete().eq('id', id);
    void cargarGuardados();
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    void pedir([]);
  }

  return (
    <section className="outfit">
      <header className="armario-cabecera">
        <h1>Pide un outfit</h1>
        {limites && !limites.premium && <span className="contador">{limites.outfits_hoy} de {limites.max_outfits} hoy</span>}
      </header>

      <form onSubmit={enviar}>
        <label>
          Ocasión
          <select required value={ocasion} onChange={(e) => setOcasion(e.target.value)}>
            <option value="">Elige…</option>
            {OCASIONES.map((o) => <option key={o} value={o}>{mayuscula(o)}</option>)}
            <option value="otra">Otra…</option>
          </select>
        </label>
        {ocasion === 'otra' && (
          <label>
            Escribe la ocasión
            <input required maxLength={80} value={otra} onChange={(e) => setOtra(e.target.value)} />
          </label>
        )}
        <label>
          Tema (opcional)
          <input maxLength={80} value={tema} placeholder="tonos tierra, años 80…" onChange={(e) => setTema(e.target.value)} />
        </label>
        <Opciones nombre="Formalidad" valor={formalidad} onCambio={setFormalidad} opciones={[['formal', 'Formal'], ['informal', 'Informal']]} />
        <Opciones nombre="Colores" valor={colores} onCambio={setColores} opciones={[['neutros', 'Neutros'], ['llamativos', 'Llamativos'], ['da_igual', 'Me da igual']]} />
        <Opciones nombre="Clima" valor={clima} onCambio={setClima} opciones={[['frio', 'Frío'], ['templado', 'Templado'], ['calor', 'Calor'], ['lluvia', 'Lluvia']]} />
        <button type="submit" disabled={ocupado}>{ocupado ? 'Armando tus outfits…' : 'Sugerir outfits'}</button>
      </form>

      {limite && <VentanaPremium motivo="outfits" />}
      {mensaje && <p className="error" role="alert">{mensaje}</p>}
      {faltan && <p className="aviso">{faltan}</p>}
      {instalar && <InstalarApp onCerrar={() => setInstalar(false)} />}

      {sugeridos.length > 0 && (
        <>
          <ul className="lista-outfits" aria-label="Outfits sugeridos">
            {sugeridos.map((o, i) => (
              <li key={i}>
                <TarjetaOutfit titulo={o.titulo} frase={o.frase} prendas={o.prendas} fotos={fotos}>
                  <div className="acciones-outfit">
                    <button type="button" disabled={!!o.guardadoId} onClick={() => void guardar(i)}>{o.guardadoId ? 'Guardado ✓' : 'Guardar'}</button>
                    <label>
                      Día
                      <select value={o.dia} onChange={(e) => cambiar(i, { dia: e.target.value })}>
                        {semana(hoy).map((f) => <option key={f} value={f}>{nombreDia(f, hoy)}</option>)}
                      </select>
                    </label>
                    <button type="button" className="secundario" onClick={() => void planificar(i)}>Planificar</button>
                  </div>
                  {o.planificado && <p className="aviso">Planificado para {nombreDia(o.planificado, hoy).toLowerCase()}</p>}
                </TarjetaOutfit>
              </li>
            ))}
          </ul>
          <button type="button" className="secundario" disabled={ocupado} onClick={() => void pedir(vistos)}>Otra vez</button>
        </>
      )}

      <h2>Guardados</h2>
      {guardados.length === 0 && <p className="cargando">Aún no guardas outfits.</p>}
      <ul className="lista-outfits" aria-label="Guardados">
        {guardados.map((g) => (
          <li key={g.id}>
            <TarjetaOutfit titulo={g.titulo} frase={g.frase} prendas={g.outfit_prendas.map((p) => p.prenda_id)} fotos={fotos}>
              <button type="button" className="secundario" onClick={() => void borrarGuardado(g.id)}>Borrar</button>
            </TarjetaOutfit>
          </li>
        ))}
      </ul>
    </section>
  );
}
