import { expect, test } from 'vitest';
import { ddmm, hoyLima, nombreDia, semana } from './fechas';

test('hoyLima usa la fecha de Perú, no la de UTC', () => {
  expect(hoyLima(new Date('2026-11-08T04:30:00Z'))).toBe('2026-11-07');
  expect(hoyLima(new Date('2026-11-08T05:30:00Z'))).toBe('2026-11-08');
});

test('semana devuelve 7 días seguidos, cruzando el año', () => {
  const s = semana('2026-12-29');
  expect(s).toHaveLength(7);
  expect(s[0]).toBe('2026-12-29');
  expect(s[6]).toBe('2027-01-04');
});

test('ddmm y nombreDia', () => {
  expect(ddmm('2026-12-05')).toBe('05/12');
  expect(nombreDia('2026-11-07', '2026-11-07')).toBe('Hoy');
  expect(nombreDia('2026-11-08', '2026-11-07')).toBe('Mañana');
  expect(nombreDia('2026-11-10', '2026-11-07')).toBe('martes 10/11');
});
