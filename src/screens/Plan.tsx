import { useCallback, useEffect, useState } from 'react';
import TarjetaOutfit from '../components/TarjetaOutfit';
import { hoyLima, nombreDia, semana } from '../lib/fechas';
import { useMinisPorPrenda } from '../lib/prendasFotos';
import { useSesion } from '../lib/sesion';
import { supabase } from '../lib/supabase';

type Dia = { fecha: string; outfit_id: string; outfits: { titulo: string; outfit_prendas: { prenda_id: string }[] } };

export default function Plan() {
  const { usuario } = useSesion();
  const fotos = useMinisPorPrenda();
  const hoy = hoyLima();
  const dias = semana(hoy);
  const [agenda, setAgenda] = useState<Record<string, Dia>>({});
  const [guardados, setGuardados] = useState<{ id: string; titulo: string }[]>([]);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('agenda')
      .select('fecha, outfit_id, outfits(titulo, outfit_prendas(prenda_id))')
      .gte('fecha', dias[0])
      .lte('fecha', dias[6]);
    setAgenda(Object.fromEntries(((data as unknown as Dia[]) ?? []).map((d) => [d.fecha, d])));
    const { data: g } = await supabase.from('outfits').select('id, titulo').order('creado_en', { ascending: false });
    setGuardados(g ?? []);
  }, [dias[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => void cargar(), [cargar]);

  async function poner(fecha: string, outfitId: string) {
    await supabase.from('agenda').upsert({ usuario_id: usuario!.id, fecha, outfit_id: outfitId }, { onConflict: 'usuario_id,fecha' });
    void cargar();
  }

  async function quitar(fecha: string) {
    await supabase.from('agenda').delete().eq('fecha', fecha);
    void cargar();
  }

  return (
    <section className="plan">
      <h1>Mi semana</h1>
      <ul className="lista-outfits" aria-label="Días">
        {dias.map((f) => {
          const d = agenda[f];
          return (
            <li key={f}>
              <h2>{nombreDia(f, hoy)}</h2>
              {d ? (
                <TarjetaOutfit titulo={d.outfits.titulo} prendas={d.outfits.outfit_prendas.map((p) => p.prenda_id)} fotos={fotos}>
                  <button type="button" className="secundario" onClick={() => void quitar(f)}>Quitar</button>
                </TarjetaOutfit>
              ) : guardados.length > 0 ? (
                <label>
                  Elegir outfit
                  <select value="" onChange={(e) => e.target.value && void poner(f, e.target.value)}>
                    <option value="">—</option>
                    {guardados.map((g) => <option key={g.id} value={g.id}>{g.titulo}</option>)}
                  </select>
                </label>
              ) : (
                <p className="cargando">Guarda outfits para planificar tu semana.</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
