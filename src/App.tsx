import { Route, Routes, useLocation } from 'react-router';
import TabBar from './components/TabBar';

function Provisional({ titulo }: { titulo: string }) {
  return <h1>{titulo}</h1>;
}

export default function App() {
  const { pathname } = useLocation();
  const conPestanas = pathname !== '/entrar';
  return (
    <div className="app">
      <main className="contenido">
        <Routes>
          <Route path="/" element={<Provisional titulo="Armario" />} />
          <Route path="/outfit" element={<Provisional titulo="Outfit" />} />
          <Route path="/plan" element={<Provisional titulo="Plan" />} />
          <Route path="/cuenta" element={<Provisional titulo="Cuenta" />} />
          <Route path="/premium" element={<Provisional titulo="Premium" />} />
          <Route path="/prenda/:id" element={<Provisional titulo="Prenda" />} />
          <Route path="/bienvenida" element={<Provisional titulo="Bienvenida" />} />
          <Route path="/entrar" element={<Provisional titulo="Entrar" />} />
          <Route path="/admin" element={<Provisional titulo="Administrador" />} />
        </Routes>
      </main>
      {conPestanas && <TabBar />}
    </div>
  );
}
