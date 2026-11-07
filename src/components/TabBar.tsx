import { NavLink } from 'react-router';

const PESTANAS = [
  { a: '/', nombre: 'Armario' },
  { a: '/outfit', nombre: 'Outfit' },
  { a: '/plan', nombre: 'Plan' },
  { a: '/cuenta', nombre: 'Cuenta' },
];

export default function TabBar() {
  return (
    <nav className="tabbar" aria-label="Secciones">
      {PESTANAS.map((p) => (
        <NavLink key={p.a} to={p.a} end>
          {p.nombre}
        </NavLink>
      ))}
    </nav>
  );
}
