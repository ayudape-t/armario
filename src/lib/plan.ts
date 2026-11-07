import type { EstadoLimites } from './api';
import { ddmm, hoyLima } from './fechas';

const DIA = 86_400_000;

export function aviso(e: EstadoLimites, ahora: Date): string | null {
  if (!e.premium || !e.premium_hasta) return null;
  const vence = new Date(e.premium_hasta);
  const falta = vence.getTime() - ahora.getTime();
  if (e.en_prueba) {
    const n = Math.ceil(falta / DIA);
    return n === 1 ? 'Te queda 1 día de Premium gratis' : `Te quedan ${n} días de Premium gratis`;
  }
  if (falta <= 3 * DIA) return `Tu Premium vence el ${ddmm(hoyLima(vence))}. Renuévalo aquí`;
  return null;
}

export function numeroOperacionValido(s: string): boolean {
  return /^[0-9]{6,20}$/.test(s.replace(/\s/g, ''));
}

export function mensajeErrorPago(codigo: string, mensaje: string): string {
  if (codigo === '23505' && mensaje.includes('pagos_numero_operacion_key')) return 'Ese número de operación ya fue registrado';
  if (codigo === '23505' && mensaje.includes('pagos_un_pendiente')) return 'Ya tienes un pago en revisión';
  return 'No pudimos registrar tu pago, inténtalo de nuevo';
}
