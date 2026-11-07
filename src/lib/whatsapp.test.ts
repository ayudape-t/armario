import { expect, test } from 'vitest';
import { linkWhatsApp } from './whatsapp';

test('arma el enlace de WhatsApp con el mensaje del pago', () => {
  const link = linkWhatsApp('51999888777', { correo: 'a@b.pe', pase: '1 mes', monto: 9.9, operacion: '123456' });
  expect(link.startsWith('https://wa.me/51999888777?text=')).toBe(true);
  expect(decodeURIComponent(link.split('?text=')[1])).toBe('Hola, pagué el pase 1 mes (S/9.90). Operación: 123456. Correo: a@b.pe');
});
