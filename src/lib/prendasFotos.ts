import { useEffect, useState } from 'react';
import { rutaMini, urlsFirmadas } from './fotos';
import { supabase } from './supabase';

/** Miniaturas de todas las prendas del cliente, por id de prenda. */
export function useMinisPorPrenda(): Record<string, string> {
  const [fotos, setFotos] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('prendas').select('id, foto_path');
      if (!data) return;
      const urls = await urlsFirmadas(data.map((p) => rutaMini(p.foto_path))).catch((): Record<string, string> => ({}));
      setFotos(Object.fromEntries(data.map((p) => [p.id, urls[rutaMini(p.foto_path)] ?? ''])));
    })();
  }, []);
  return fotos;
}
