import { expect, test } from '@playwright/test';
import { entrarConCorreo } from './ayudas';
import { admin, idDe } from './entorno';

const VESTIDO = 'e2e/fixtures/vestido.webp';
const POLO = 'e2e/fixtures/polo.jpg';
const prendas = (page: import('@playwright/test').Page) => page.getByRole('list', { name: 'Prendas' }).getByRole('listitem');

test('subir una foto la deja clasificada en su categoría', async ({ page }) => {
  test.skip(process.env.IA_APAGADA === '1');
  await entrarConCorreo(page);
  await expect(page).toHaveURL(/bienvenida/);
  await page.getByLabel('Agregar prendas').setInputFiles(VESTIDO);
  await expect(page.getByText('Lista', { exact: true })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('link', { name: 'Ver mi armario' }).click();
  await page.getByRole('button', { name: 'Vestidos' }).click();
  await expect(prendas(page)).toHaveCount(1);
});

test('si la IA falla, la prenda queda sin clasificar y se corrige a mano', async ({ page }) => {
  test.skip(process.env.IA_APAGADA !== '1');
  await entrarConCorreo(page);
  await page.getByLabel('Agregar prendas').setInputFiles(POLO);
  await expect(page.getByText('Sin clasificar: elige la categoría')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('link', { name: 'Ver mi armario' }).click();
  await page.getByRole('button', { name: 'Sin clasificar' }).click();
  await prendas(page).first().getByRole('link').click();
  await page.getByRole('combobox', { name: 'Categoría' }).selectOption({ label: 'Partes de abajo' });
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page).toHaveURL(/\/app\/?$/);
  await page.getByRole('button', { name: 'Partes de abajo' }).click();
  await expect(prendas(page)).toHaveCount(1);
});

test('con 49 prendas en el plan gratis, de 3 fotos entra 1 y las otras piden Premium', async ({ page }) => {
  test.skip(process.env.IA_APAGADA === '1');
  const correo = await entrarConCorreo(page);
  const uid = await idDe(correo);
  await admin.from('perfiles').update({ premium_hasta: new Date(Date.now() - 86_400_000).toISOString() }).eq('id', uid);
  await admin.from('prendas').insert(Array.from({ length: 49 }, (_, i) => ({
    usuario_id: uid, foto_path: `${uid}/sembrada-${i}.webp`, estado: 'lista', categoria: 'arriba',
  })));
  await page.goto('/app/');
  await expect(page.getByText('49 de 50')).toBeVisible();
  await page.getByLabel('Agregar prendas').setInputFiles([VESTIDO, POLO, VESTIDO]);
  await expect(page.getByText('Lista', { exact: true })).toHaveCount(1, { timeout: 30_000 });
  await expect(page.getByText('Llegaste al límite del plan gratis')).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Ver Premium' })).toBeVisible();
});

test('borrar una prenda la quita del armario', async ({ page }) => {
  test.skip(process.env.IA_APAGADA === '1');
  const correo = await entrarConCorreo(page);
  const uid = await idDe(correo);
  await admin.from('prendas').insert({ usuario_id: uid, foto_path: `${uid}/otra.webp`, estado: 'sin_clasificar' });
  await page.goto('/app/');
  await page.getByLabel('Agregar prendas').setInputFiles(VESTIDO);
  await expect(page.getByText('Lista', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(prendas(page)).toHaveCount(2);
  await page.getByRole('button', { name: 'Vestidos' }).click();
  await prendas(page).first().getByRole('link').click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Borrar prenda' }).click();
  await expect(page).toHaveURL(/\/app\/?$/);
  await page.getByRole('button', { name: 'Todo' }).click();
  await expect(prendas(page)).toHaveCount(1);
});
