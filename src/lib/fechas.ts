const ZONA = 'America/Lima';
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Fecha de hoy en Perú como 'YYYY-MM-DD'. */
export function hoyLima(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);
}

const aUTC = (fecha: string) => new Date(`${fecha}T00:00:00Z`);
const sumarDias = (fecha: string, n: number) => new Date(aUTC(fecha).getTime() + n * 86_400_000).toISOString().slice(0, 10);

export function semana(desde: string): string[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(desde, i));
}

export function ddmm(fecha: string): string {
  const [, m, d] = fecha.split('-');
  return `${d}/${m}`;
}

export function nombreDia(fecha: string, hoy: string): string {
  if (fecha === hoy) return 'Hoy';
  if (fecha === sumarDias(hoy, 1)) return 'Mañana';
  return `${DIAS[aUTC(fecha).getUTCDay()]} ${ddmm(fecha)}`;
}
