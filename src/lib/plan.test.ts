import { expect, test } from 'vitest';
import type { EstadoLimites } from './api';
import { aviso, mensajeErrorPago, numeroOperacionValido } from './plan';

const base: EstadoLimites = {
  premium: true, en_prueba: false, premium_hasta: null, prendas: 0, max_prendas: 1000,
  outfits_hoy: 0, max_outfits: 30, clasificaciones_hoy: 0, max_clasificaciones: 100,
};
const AHORA = new Date('2026-12-03T17:00:00Z');
const enDias = (d: number) => new Date(AHORA.getTime() + d * 86_400_000).toISOString();

test('durante la prueba gratis cuenta los días que quedan', () => {
  expect(aviso({ ...base, en_prueba: true, premium_hasta: enDias(6.2) }, AHORA)).toBe('Te quedan 7 días de Premium gratis');
  expect(aviso({ ...base, en_prueba: true, premium_hasta: enDias(0.5) }, AHORA)).toBe('Te queda 1 día de Premium gratis');
});

test('3 días antes de vencer avisa con la fecha de Perú', () => {
  expect(aviso({ ...base, premium_hasta: '2026-12-05T17:00:00Z' }, AHORA)).toBe('Tu Premium vence el 05/12. Renuévalo aquí');
});

test('sin aviso si falta más o si ya es plan gratis', () => {
  expect(aviso({ ...base, premium_hasta: enDias(10) }, AHORA)).toBeNull();
  expect(aviso({ ...base, premium: false, premium_hasta: enDias(-1), max_prendas: 50, max_outfits: 3 }, AHORA)).toBeNull();
});

test('número de operación: solo dígitos, de 6 a 20', () => {
  expect(numeroOperacionValido(' 12345678 ')).toBe(true);
  expect(numeroOperacionValido('12a45678')).toBe(false);
  expect(numeroOperacionValido('12345')).toBe(false);
});

test('mensajes de error del pago', () => {
  expect(mensajeErrorPago('23505', 'duplicate key value violates unique constraint "pagos_numero_operacion_key"'))
    .toBe('Ese número de operación ya fue registrado');
  expect(mensajeErrorPago('23505', 'duplicate key value violates unique constraint "pagos_un_pendiente"'))
    .toBe('Ya tienes un pago en revisión');
  expect(mensajeErrorPago('500', 'otra cosa')).toBe('No pudimos registrar tu pago, inténtalo de nuevo');
});
