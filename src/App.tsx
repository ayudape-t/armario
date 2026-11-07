import { Route, Routes, useLocation } from 'react-router';
import TabBar from './components/TabBar';
import { Protegida, useSesion } from './lib/sesion';
import Admin from './screens/Admin';
import Armario from './screens/Armario';
import Bienvenida from './screens/Bienvenida';
import Cuenta from './screens/Cuenta';
import Entrar from './screens/Entrar';
import Outfit from './screens/Outfit';
import Plan from './screens/Plan';
import Premium from './screens/Premium';
import Prenda from './screens/Prenda';

const PROTEGIDAS: [string, React.ReactNode][] = [
  ['/', <Armario />],
  ['/outfit', <Outfit />],
  ['/plan', <Plan />],
  ['/cuenta', <Cuenta />],
  ['/premium', <Premium />],
  ['/prenda/:id', <Prenda />],
  ['/bienvenida', <Bienvenida />],
  ['/admin', <Admin />],
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
