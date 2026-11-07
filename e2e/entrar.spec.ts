import { expect, test } from '@playwright/test';
import { entrarConCorreo } from './ayudas';

test('sin sesión, la app lleva a Entrar', async ({ page }) => {
  await page.goto('/app/');
  await expect(page).toHaveURL(/\/app\/entrar$/);
});

test('sin aceptar los Términos no se puede entrar', async ({ page }) => {
  await page.goto('/app/entrar');
  await expect(page.getByRole('button', { name: 'Entrar con Google' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Recibir código' })).toBeDisabled();
});

test('con correo y código se llega al armario', async ({ page }) => {
  await entrarConCorreo(page);
  await expect(page).toHaveURL(/\/app\/?$/);
  await expect(page.getByRole('link', { name: 'Armario' })).toBeVisible();
});
