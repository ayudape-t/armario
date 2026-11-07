import { Route, Routes, useLocation } from 'react-router';
import TabBar from './components/TabBar';
import { Protegida, useSesion } from './lib/sesion';
import Entrar from './screens/Entrar';

function Provisional({ titulo }: { titulo: string }) {
  return <h1>{titulo}</h1>;
}

const PROTEGIDAS: [string, string][] = [
  ['/', 'Armario'],
  ['/outfit', 'Outfit'],
  ['/plan', 'Plan'],
  ['/cuenta', 'Cuenta'],
  ['/premium', 'Premium'],
  ['/prenda/:id', 'Prenda'],
  ['/bienvenida', 'Bienvenida'],
  ['/admin', 'Administrador'],
];

export default function App() {
  const { pathname } = useLocation();
  const { usuario } = useSesion();
  return (
    <div className="app">
      <main className="contenido">
        <Routes>
          <Route path="/entrar" element={<Entrar />} />
          {PROTEGIDAS.map(([ruta, titulo]) => (
            <Route key={ruta} path={ruta} element={<Protegida><Provisional titulo={titulo} /></Protegida>} />
          ))}
        </Routes>
      </main>
      {usuario && pathname !== '/entrar' && <TabBar />}
    </div>
  );
}
