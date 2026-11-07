import { expect, type Page } from '@playwright/test';

const MAILPIT = 'http://127.0.0.1:54324/api/v1';

async function codigoDe(correo: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const r = await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:${correo}`)}`);
    const { messages } = await r.json();
    if (messages?.length) {
      const m = await (await fetch(`${MAILPIT}/message/${messages[0].ID}`)).json();
      const codigo = /\b(\d{6})\b/.exec(m.Text ?? '')?.[1];
      if (codigo) return codigo;
    }
    await new Promise((ok) => setTimeout(ok, 500));
  }
  throw new Error(`No llegó el código a ${correo}`);
}

/** Entra a la app con un correo nuevo usando el código de 6 dígitos de Mailpit. */
export async function entrarConCorreo(page: Page, correo = `prueba-${crypto.randomUUID().slice(0, 8)}@prueba.pe`) {
  await page.goto('/app/entrar');
  await page.getByLabel(/Acepto los Términos/).check();
  await page.getByLabel('Correo').fill(correo);
  await page.getByRole('button', { name: 'Recibir código' }).click();
  await page.getByLabel('Código de 6 dígitos').fill(await codigoDe(correo));
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible();
  return correo;
}
