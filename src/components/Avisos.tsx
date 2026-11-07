import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { estadoLimites } from '../lib/api';
import { aviso } from '../lib/plan';

export default function Avisos() {
  const [texto, setTexto] = useState<string | null>(null);
  useEffect(() => {
    estadoLimites().then((e) => setTexto(aviso(e, new Date()))).catch(() => {});
  }, []);
  return texto ? <Link className="banner" to="/premium">{texto}</Link> : null;
}
