import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { CALIDECES, CATEGORIAS, FORMALIDADES, NOMBRE_CATEGORIA, PALETA } from '../../supabase/functions/_shared/catalogo.ts';
import { MENSAJE_SIN_CONEXION, sinConexion } from '../lib/conexion';
import { borrarFotos, urlsFirmadas } from '../lib/fotos';
import { supabase } from '../lib/supabase';

type Ficha = { foto_path: string; categoria: string; tipo: string; colores: string[]; formalidad: string; calidez: string };

export default function Prenda() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [foto, setFoto] = useState('');
  const [estado, setEstado] = useState<'cargando' | 'lista' | 'no_existe'>('cargando');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('prendas').select('foto_path, categoria, tipo, colores, formalidad, calidez').eq('id', id!).maybeSingle();
      if (!data) return setEstado('no_existe');
      setFicha({ foto_path: data.foto_path, categoria: data.categoria ?? '', tipo: data.tipo ?? '', colores: data.colores ?? [], formalidad: data.formalidad ?? '', calidez: data.calidez ?? '' });
      setEstado('lista');
      const urls: Record<string, string> = await urlsFirmadas([data.foto_path]).catch(() => ({}));
      setFoto(urls[data.foto_path] ?? '');
    })();
  }, [id]);

  if (estado === 'cargando') return <p className="cargando">Cargando…</p>;
  if (estado === 'no_existe' || !ficha) return <p>Esta prenda ya no existe. <Link to="/">Volver al armario</Link></p>;

  const cambiar = (c: Partial<Ficha>) => setFicha({ ...ficha, ...c });
  const fallo = (e: unknown) => setError(sinConexion(e) ? MENSAJE_SIN_CONEXION : 'No pudimos guardar. Inténtalo de nuevo.');

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    const { error } = await supabase.from('prendas').update({
      categoria: ficha!.categoria || null,
      tipo: ficha!.tipo.trim() || null,
      colores: ficha!.colores.length ? ficha!.colores : null,
      formalidad: ficha!.formalidad || null,
      calidez: ficha!.calidez || null,
      estado: ficha!.categoria ? 'lista' : 'sin_clasificar',
    }).eq('id', id!);
    setOcupado(false);
    if (error) return fallo(error);
    navegar('/');
  }

  async function borrar() {
    if (!confirm('¿Borrar esta prenda? También se quitará de tus outfits guardados.')) return;
    setOcupado(true);
    const { error } = await supabase.from('prendas').delete().eq('id', id!);
    if (error) {
      setOcupado(false);
      return fallo(error);
    }
    await borrarFotos(ficha!.foto_path).catch(() => {});
    navegar('/');
  }

  return (
    <section className="prenda">
      <Link to="/">← Armario</Link>
      {foto && <img className="foto-grande" src={foto} alt="" />}
      <form onSubmit={guardar}>
        <label>
          Categoría
          <select required value={ficha.categoria} onChange={(e) => cambiar({ categoria: e.target.value })}>
            <option value="">Elige…</option>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{NOMBRE_CATEGORIA[c]}</option>)}
          </select>
        </label>
        <label>
          Tipo
          <input maxLength={40} value={ficha.tipo} placeholder="polo, jean, botines…" onChange={(e) => cambiar({ tipo: e.target.value })} />
        </label>
        <fieldset className="colores">
          <legend>Colores (hasta 3)</legend>
          {PALETA.map((c) => {
            const marcado = ficha.colores.includes(c);
            return (
              <label key={c} className="casilla">
                <input type="checkbox" checked={marcado} disabled={!marcado && ficha.colores.length >= 3}
                  onChange={() => cambiar({ colores: marcado ? ficha.colores.filter((x) => x !== c) : [...ficha.colores, c] })} />
                {c}
              </label>
            );
          })}
        </fieldset>
        <label>
          Formalidad
          <select value={ficha.formalidad} onChange={(e) => cambiar({ formalidad: e.target.value })}>
            <option value="">—</option>
            {FORMALIDADES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label>
          Qué tan abrigada es
          <select value={ficha.calidez} onChange={(e) => cambiar({ calidez: e.target.value })}>
            <option value="">—</option>
            {CALIDECES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <button type="submit" disabled={ocupado}>Guardar</button>
        <button type="button" className="peligro" disabled={ocupado} onClick={borrar}>Borrar prenda</button>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
    </section>
  );
}
