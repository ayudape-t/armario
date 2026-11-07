import { expect, test } from '@playwright/test';
import { entrarConCorreo } from './ayudas';
import { admin, idDe } from './entorno';

test('pedir, guardar y planificar outfits', async ({ page }) => {
  test.skip(process.env.IA_APAGADA === '1');
  const correo = await entrarConCorreo(page);
  const uid = await idDe(correo);
  await admin.from('prendas').insert(['vestido', 'calzado', 'abrigo', 'accesorio'].map((categoria, i) => ({
    usuario_id: uid, foto_path: `${uid}/p${i}.webp`, estado: 'lista', categoria, colores: ['negro'],
  })));

  await page.goto('/app/outfit');
  await page.getByRole('combobox', { name: 'Ocasión' }).selectOption({ label: 'Fiesta de noche' });
  await page.getByRole('radio', { name: 'Informal' }).check();
  await page.getByRole('radio', { name: 'Llamativos' }).check();
  await page.getByRole('radio', { name: 'Frío' }).check();
  await page.getByRole('button', { name: 'Sugerir outfits' }).click();

  const sugeridos = page.getByRole('list', { name: 'Outfits sugeridos' }).getByRole('listitem');
  await expect(sugeridos).toHaveCount(3);

  await sugeridos.nth(0).getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('list', { name: 'Guardados' }).getByRole('listitem')).toHaveCount(1);

  await sugeridos.nth(1).getByRole('combobox', { name: 'Día' }).selectOption({ label: 'Mañana' });
  await sugeridos.nth(1).getByRole('button', { name: 'Planificar' }).click();
  await expect(sugeridos.nth(1).getByText(/Planificado/)).toBeVisible();

  await sugeridos.nth(2).getByRole('combobox', { name: 'Día' }).selectOption({ label: 'Hoy' });
  await sugeridos.nth(2).getByRole('button', { name: 'Planificar' }).click();
  await expect(sugeridos.nth(2).getByText(/Planificado/)).toBeVisible();

  await page.getByRole('link', { name: 'Plan' }).click();
  await expect(page.getByRole('list', { name: 'Días' }).getByRole('listitem').filter({ hasText: 'Mañana' })).toContainText('Abrigada y cómoda');

  await page.getByRole('link', { name: 'Armario' }).click();
  await expect(page.getByText('Hoy: Toque dorado')).toBeVisible();
});

test('con una sola prenda avisa que faltan prendas', async ({ page }) => {
  const uid = await idDe(await entrarConCorreo(page));
  await admin.from('prendas').insert({ usuario_id: uid, foto_path: `${uid}/sola.webp`, estado: 'lista', categoria: 'vestido' });
  await page.goto('/app/outfit');
  await page.getByRole('combobox', { name: 'Ocasión' }).selectOption({ label: 'Casual' });
  await page.getByRole('button', { name: 'Sugerir outfits' }).click();
  await expect(page.getByText('Agrega prendas para armar outfits')).toBeVisible();
});
