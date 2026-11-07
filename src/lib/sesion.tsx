import type { User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { supabase } from './supabase';

type Sesion = { usuario: User | null; cargando: boolean };

export const SesionContext = createContext<Sesion>({ usuario: null, cargando: true });

export function SesionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion>({ usuario: null, cargando: true });
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion({ usuario: data.session?.user ?? null, cargando: false }));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSesion({ usuario: s?.user ?? null, cargando: false }));
    return () => data.subscription.unsubscribe();
  }, []);
  return <SesionContext.Provider value={sesion}>{children}</SesionContext.Provider>;
}

export const useSesion = () => useContext(SesionContext);

export function Protegida({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useSesion();
  if (cargando) return <p className="cargando">Cargando…</p>;
  return usuario ? children : <Navigate to="/entrar" replace />;
}
