export function linkWhatsApp(numero: string, d: { correo: string; pase: string; monto: number; operacion: string }): string {
  const texto = `Hola, pagué el pase ${d.pase} (S/${d.monto.toFixed(2)}). Operación: ${d.operacion}. Correo: ${d.correo}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
