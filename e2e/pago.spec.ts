import { expect, test } from '@playwright/test';
import { entrarConCorreo } from './ayudas';
import { admin, idDe } from './entorno';

const fechaLima = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(d).split('-').reverse().join('/');

test('pago con Yape: el cliente registra, el admin aprueba y Premium queda activo', async ({ browser }) => {
  const cliente = await (await browser.newContext()).newPage();
  const correoCliente = await entrarConCorreo(cliente);
  await admin.from('perfiles').update({ premium_hasta: new Date(Date.now() - 86_400_000).toISOString() }).eq('id', await idDe(correoCliente));

  const operacion = String(Date.now()).slice(-10);
  await cliente.goto('/app/premium');
  await cliente.getByRole('radio', { name: /1 mes/ }).check();
  await cliente.getByLabel('Número de operación').fill(operacion);
  await cliente.getByRole('button', { name: 'Ya pagué' }).click();
  await expect(cliente.getByRole('heading', { name: 'En revisión' })).toBeVisible();
  await expect(cliente.getByRole('link', { name: 'Avisar por WhatsApp' })).toHaveAttribute('href', /wa\.me\/51999888777/);

  const jefa = await (await browser.newContext()).newPage();
  const correoAdmin = await entrarConCorreo(jefa);
  await admin.from('perfiles').update({ es_admin: true }).eq('id', await idDe(correoAdmin));
  await jefa.goto('/app/admin');
  const fila = jefa.getByRole('row').filter({ hasText: correoCliente });
  await expect(fila).toContainText(operacion);
  await fila.getByRole('button', { name: 'Aprobar' }).click();
  await expect(fila).toHaveCount(0);

  await cliente.goto('/app/cuenta');
  await expect(cliente.getByText('Premium', { exact: true })).toBeVisible();
  await expect(cliente.getByText(`Vence el ${fechaLima(new Date(Date.now() + 30 * 86_400_000))}`)).toBeVisible();

  await cliente.goto('/app/premium');
  await cliente.getByLabel('Número de operación').fill(operacion);
  await cliente.getByRole('button', { name: 'Ya pagué' }).click();
  await expect(cliente.getByText('Ese número de operación ya fue registrado')).toBeVisible();
});

test('quien no es admin no entra al panel', async ({ page }) => {
  await entrarConCorreo(page);
  await page.goto('/app/admin');
  await expect(page).toHaveURL(/\/app\/?(bienvenida)?$/);
});
