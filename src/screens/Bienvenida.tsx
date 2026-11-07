import { useState } from 'react';
import { Link } from 'react-router';
import SubidaFotos from '../components/SubidaFotos';
import { useSesion } from '../lib/sesion';

export default function Bienvenida() {
  const { usuario } = useSesion();
  const [listas, setListas] = useState(0);
  return (
    <section className="bienvenida">
      <h1>Te damos la bienvenida</h1>
      <p>Toma fotos de al menos 5 prendas para empezar. La app las ordena sola por categoría.</p>
      <SubidaFotos uid={usuario!.id} onCambio={setListas} />
      {listas > 0 && (
        <div className="acciones">
          {listas < 5 && <p>Llevas {listas}. Con 5 o más, los outfits salen mejor.</p>}
          <Link className="boton" to="/outfit">Pedir mi primer outfit</Link>
          <Link to="/">Ver mi armario</Link>
        </div>
      )}
    </section>
  );
}
