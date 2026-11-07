import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CATEGORIAS, NOMBRE_CATEGORIA, type Categoria } from '../../supabase/functions/_shared/catalogo.ts';
import SubidaFotos from '../components/SubidaFotos';
import { estadoLimites, type EstadoLimites } from '../lib/api';
import { MENSAJE_SIN_CONEXION, sinConexion } from '../lib/conexion';
import { hoyLima } from '../lib/fechas';
import { rutaMini, urlsFirmadas } from '../lib/fotos';
import { useSesion } from '../lib/sesion';
import { supabase } from '../lib/supabase';

type PrendaFila = { id: string; foto_path: string; estado: 'lista' | 'sin_clasificar'; categoria: Categoria | null; tipo: string | null };
type Filtro = 'todo' | Categoria | 'sin_clasificar';

export default function Armario() {
  const { usuario } = useSesion();
  const navegar = useNavigate();
  const [prendas, setPrendas] = useState<PrendaFila[] | null>(null);
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [limites, setLimites] = useState<EstadoLimites | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todo');
  const [error, setError] = useState('');
  const [hoy, setHoy] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('prendas')
        .select('id, foto_path, estado, categoria, tipo')
        .order('creado_en', { ascending: false });
      if (error) throw error;
      setPrendas(data as PrendaFila[]);
      setLimites(await estadoLimites());
      const { data: plan } = await supabase.from('agenda').select('outfits(titulo)').eq('fecha', hoyLima()).maybeSingle();
      setHoy((plan?.outfits as unknown as { titulo: string } | null)?.titulo ?? null);
      setFotos(await urlsFirmadas(data.map((p) => rutaMini(p.foto_path))).catch(() => ({})));
      setError('');
    } catch (e) {
      setError(sinConexion(e) ? MENSAJE_SIN_CONEXION : 'No pudimos cargar tu armario. Inténtalo de nuevo.');
    }
  }, []);

  useEffect(() => void cargar(), [cargar]);
  useEffect(() => {
    if (prendas?.length === 0) navegar('/bienvenida', { replace: true });
  }, [prendas, navegar]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!prendas || !limites) return <p className="cargando">Cargando…</p>;

  const hay = (f: Filtro) => (f === 'todo' ? prendas.length : prendas.filter((p) => (f === 'sin_clasificar' ? p.estado === f : p.categoria === f)).length);
  const visibles = filtro === 'todo' ? prendas : prendas.filter((p) => (filtro === 'sin_clasificar' ? p.estado === 'sin_clasificar' : p.categoria === filtro));
  const filtros: [Filtro, string][] = [['todo', 'Todo'], ...CATEGORIAS.map((c): [Filtro, string] => [c, NOMBRE_CATEGORIA[c]])];
  if (hay('sin_clasificar') > 0) filtros.push(['sin_clasificar', 'Sin clasificar']);

  return (
    <section className="armario">
      <header className="armario-cabecera">
        <h1>Mi armario</h1>
        {!limites.premium && <span className="contador">{limites.prendas} de {limites.max_prendas}</span>}
      </header>

      {hoy && <Link className="hoy" to="/plan">Hoy: {hoy}</Link>}

      <SubidaFotos uid={usuario!.id} onCambio={cargar} />

      <div className="filtros" role="group" aria-label="Filtrar por categoría">
        {filtros.map(([f, nombre]) => (
          <button key={f} type="button" aria-pressed={filtro === f} className={filtro === f ? 'activo' : 'secundario'} onClick={() => setFiltro(f)}>
            {nombre}
          </button>
        ))}
      </div>

      <ul className="cuadricula" aria-label="Prendas">
        {visibles.map((p) => (
          <li key={p.id} className={p.estado === 'sin_clasificar' ? 'por-clasificar' : undefined}>
            <Link to={`/prenda/${p.id}`} aria-label={p.tipo ?? (p.categoria ? NOMBRE_CATEGORIA[p.categoria] : 'Prenda sin clasificar')}>
              {fotos[rutaMini(p.foto_path)] ? <img src={fotos[rutaMini(p.foto_path)]} alt="" loading="lazy" /> : <span className="sin-foto" />}
              {p.estado === 'sin_clasificar' && <span className="etiqueta">Elegir categoría</span>}
            </Link>
          </li>
        ))}
      </ul>
      {visibles.length === 0 && <p className="cargando">No hay prendas en esta categoría.</p>}
    </section>
  );
}
