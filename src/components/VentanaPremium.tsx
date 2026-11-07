import { Link } from 'react-router';

const TEXTO = {
  prendas: 'Con Premium guardas todas tus prendas, sin límite.',
  outfits: 'Con Premium pides outfits sin límite cada día.',
};

export default function VentanaPremium({ motivo }: { motivo: keyof typeof TEXTO }) {
  return (
    <aside className="ventana-premium" aria-label="Premium">
      <strong>Pasa a Premium</strong>
      <p>{TEXTO[motivo]} Desde S/6.66 al mes.</p>
      <Link className="boton" to="/premium">
        Ver Premium
      </Link>
    </aside>
  );
}
