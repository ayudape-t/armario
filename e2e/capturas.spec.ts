import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { entrarConCorreo } from './ayudas';
import { admin, idDe } from './entorno';

// Genera las capturas de la página de inicio: CAPTURAS=1 npx playwright test e2e/capturas.spec.ts
test.skip(process.env.CAPTURAS !== '1');
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

const DEMO: [string, string, string, string[]][] = [
  ['vestido-negro', 'vestido', 'vestido', ['negro']],
  ['casaca-marron', 'abrigo', 'casaca de cuero', ['marrón']],
  ['jean-azul', 'abajo', 'jean', ['azul']],
  ['blusa-blanca', 'arriba', 'blusa', ['blanco']],
  ['botines-camel', 'calzado', 'botines', ['beige']],
  ['aretes-dorados', 'accesorio', 'aretes', ['dorado']],
];

test('capturas de la página de inicio', async ({ page }) => {
  const uid = await idDe(await entrarConCorreo(page));
  for (const [archivo, categoria, tipo, colores] of DEMO) {
    const ruta = `${uid}/${crypto.randomUUID()}.jpg`;
    const foto = readFileSync(`e2e/fixtures/demo-${archivo}.jpg`);
    await admin.storage.from('prendas').upload(ruta, foto, { contentType: 'image/jpeg' });
    await admin.storage.from('prendas').upload(ruta.replace('.jpg', '_mini.jpg'), foto, { contentType: 'image/jpeg' });
    await admin.from('prendas').insert({ usuario_id: uid, foto_path: ruta, estado: 'lista', categoria, tipo, colores, formalidad: 'ambas', calidez: 'media' });
  }

  await page.goto('/app/outfit');
  await page.getByRole('combobox', { name: 'Ocasión' }).selectOption({ label: 'Fiesta de noche' });
  await page.getByRole('radio', { name: 'Frío' }).check();
  await page.getByRole('button', { name: 'Sugerir outfits' }).click();
  const sugeridos = page.getByRole('list', { name: 'Outfits sugeridos' }).getByRole('listitem');
  await expect(sugeridos).toHaveCount(3);
  for (const [i, dia] of [[0, 'Hoy'], [1, 'Mañana']] as const) {
    await sugeridos.nth(i).getByRole('combobox', { name: 'Día' }).selectOption({ label: dia });
    await sugeridos.nth(i).getByRole('button', { name: 'Planificar' }).click();
    await expect(sugeridos.nth(i).getByText(/Planificado/)).toBeVisible();
  }
  await page.getByRole('button', { name: 'Ahora no' }).click().catch(() => {});
  await sugeridos.first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'public/capturas/outfit.jpg', type: 'jpeg', quality: 80 });

  await page.goto('/app/');
  await expect(page.getByRole('list', { name: 'Prendas' }).getByRole('listitem')).toHaveCount(6);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'public/capturas/armario.jpg', type: 'jpeg', quality: 80 });

  await page.goto('/app/plan');
  await expect(page.getByRole('list', { name: 'Días' }).getByRole('heading', { name: 'Noche con brillo' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'public/capturas/plan.jpg', type: 'jpeg', quality: 80 });
});
