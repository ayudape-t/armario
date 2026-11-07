import { expect, test } from '@playwright/test';

test('la página de inicio muestra los precios y la prueba gratis', async ({ page }) => {
  await page.goto('/');
  for (const texto of ['S/9.90', 'S/24.90', 'S/79.90', '7 días']) await expect(page.getByText(texto).first()).toBeVisible();
  await page.getByRole('link', { name: 'Empezar gratis' }).first().click();
  await expect(page).toHaveURL(/\/app\/entrar$/);
});

test('Términos y Privacidad existen y Privacidad menciona a Anthropic', async ({ page }) => {
  for (const ruta of ['/terminos', '/privacidad']) {
    const r = await page.goto(ruta);
    expect(r?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  await expect(page.getByText(/Anthropic/).first()).toBeVisible();
});
