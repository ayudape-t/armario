import { expect, test } from 'vitest';
import { formatoSalida, medidas, rutaFoto, rutaMini } from './fotos';

test('medidas reduce al lado mayor sin deformar', () => {
  expect(medidas(4032, 3024, 1024)).toEqual({ ancho: 1024, alto: 768 });
  expect(medidas(3024, 4032, 300)).toEqual({ ancho: 225, alto: 300 });
});

test('medidas no agranda fotos pequeñas', () => {
  expect(medidas(800, 600, 1024)).toEqual({ ancho: 800, alto: 600 });
});

test('si el navegador no codifica WebP se usa JPEG', () => {
  expect(formatoSalida('image/png')).toEqual({ tipo: 'image/jpeg', ext: 'jpg' });
  expect(formatoSalida('image/webp')).toEqual({ tipo: 'image/webp', ext: 'webp' });
});

test('rutas de la foto y su miniatura', () => {
  expect(rutaFoto('u1', 'abc', 'jpg')).toBe('u1/abc.jpg');
  expect(rutaMini('u/abc.webp')).toBe('u/abc_mini.webp');
  expect(rutaMini('u/abc.jpg')).toBe('u/abc_mini.jpg');
});
