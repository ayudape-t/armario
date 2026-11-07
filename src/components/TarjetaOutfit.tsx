import type { ReactNode } from 'react';

type Props = { titulo: string; frase?: string; prendas: string[]; fotos: Record<string, string>; children?: ReactNode };

export default function TarjetaOutfit({ titulo, frase, prendas, fotos, children }: Props) {
  return (
    <article className="tarjeta-outfit">
      {prendas.length > 0 ? (
        <div className="minis">
          {prendas.map((id) => (fotos[id] ? <img key={id} src={fotos[id]} alt="" /> : <span key={id} className="sin-foto" />))}
        </div>
      ) : (
        <p className="cargando">Este outfit ya no tiene prendas</p>
      )}
      <h3>{titulo}</h3>
      {frase && <p>{frase}</p>}
      {children}
    </article>
  );
}
