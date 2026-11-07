import { expect, test } from '@playwright/test';
import { entrarConCorreo } from './ayudas';
import { admin, idDe } from './entorno';

test('pedir, guardar y planificar outfits', async ({ page }) => {
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
  await expect(page.getByRole('list', { name: 'Días' }).getByRole('listitem').filter({ hasText: 'Mañana' })).toContainText('Outfit 2');

  await page.getByRole('link', { name: 'Armario' }).click();
  await expect(page.getByText('Hoy: Outfit 3')).toBeVisible();
});
