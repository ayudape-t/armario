import { Route, Routes, useLocation } from 'react-router';
import TabBar from './components/TabBar';
import { Protegida, useSesion } from './lib/sesion';
import Armario from './screens/Armario';
import Bienvenida from './screens/Bienvenida';
import Entrar from './screens/Entrar';
import Prenda from './screens/Prenda';

function Provisional({ titulo }: { titulo: string }) {
  return <h1>{titulo}</h1>;
}

const PROTEGIDAS: [string, React.ReactNode][] = [
  ['/', <Armario />],
  ['/outfit', <Provisional titulo="Outfit" />],
  ['/plan', <Provisional titulo="Plan" />],
  ['/cuenta', <Provisional titulo="Cuenta" />],
  ['/premium', <Provisional titulo="Premium" />],
  ['/prenda/:id', <Prenda />],
  ['/bienvenida', <Bienvenida />],
  ['/admin', <Provisional titulo="Administrador" />],
];

export default function App() {
  const { pathname } = useLocation();
  const { usuario } = useSesion();
  return (
    <div className="app">
      <main className="contenido">
        <Routes>
          <Route path="/entrar" element={<Entrar />} />
          {PROTEGIDAS.map(([ruta, pantalla]) => (
            <Route key={ruta} path={ruta} element={<Protegida>{pantalla}</Protegida>} />
          ))}
        </Routes>
      </main>
      {usuario && pathname !== '/entrar' && <TabBar />}
    </div>
  );
}
