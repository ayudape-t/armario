# Puesta en marcha

Guía para publicar Armario por primera vez. Ninguna contraseña ni clave va al repositorio: se guardan en Supabase, Cloudflare o GitHub.

## 0. Antes de empezar: lo que necesitas

- Cuentas en **Supabase**, **Cloudflare**, **Anthropic** (console.anthropic.com) y **Google Cloud** (para el botón «Entrar con Google»).
- Tu QR de Yape (imagen), tu número de Yape y tu número de WhatsApp.
- Un **correo de contacto** y el **nombre del responsable** para completar Términos y Privacidad (hoy dicen «(pendiente)»).
- **Para entrar con código por correo hace falta un dominio propio.** El correo que trae Supabase solo envía a los miembros de tu equipo; para clientes reales hay que conectar un servicio de correo (por ejemplo, Resend, gratis hasta 3,000 correos al mes), y ese servicio pide un dominio verificado. Sin dominio, la app funciona solo con «Entrar con Google».

## 1. Supabase (base de datos, fotos y funciones)

1. Crea dos proyectos en el plan **Free**, región **South America (São Paulo)**:
   - `armario` (el real);
   - `armario-pruebas` (para probar sin tocar datos de clientes).
2. Para cada proyecto, en una terminal dentro del repositorio:

   ```bash
   npx supabase login
   ```

   ```bash
   npx supabase link --project-ref <ref-del-proyecto>
   ```

   ```bash
   npx supabase db push
   ```

   ```bash
   npx supabase functions deploy clasificar-prenda sugerir-outfit borrar-cuenta
   ```

3. Guarda la clave de la IA como secreto (cópiala de console.anthropic.com → API Keys):

   ```bash
   npx supabase secrets set ANTHROPIC_API_KEY=<tu-clave> IA_MODELO=claude-haiku-5-5
   ```

4. En **console.anthropic.com → Settings → Limits**, pon un tope de gasto mensual de **US$20**.

## 2. Login

1. **Supabase → Authentication → URL Configuration**:
   - Site URL: `https://<tu-dominio>/app/`
   - Redirect URLs: `https://<tu-dominio>/app/`
2. **Supabase → Authentication → Emails → Templates**: en «Magic Link» y en «Confirm signup» pega el contenido de `supabase/templates/codigo.html`, con el asunto «Tu código para entrar a Armario».
3. **Correo propio (SMTP)**: en **Authentication → Emails → SMTP Settings**, conecta tu servicio de correo con tu dominio (ver punto 0).
4. **Google**:
   1. En Google Cloud Console → **APIs y servicios → Pantalla de consentimiento de OAuth**: nombre «Armario», enlace a la página de inicio (`https://<tu-dominio>/`) y a la política de privacidad (`https://<tu-dominio>/privacidad`).
   2. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**. En «URI de redireccionamiento autorizados» pon `https://<ref-del-proyecto>.supabase.co/auth/v1/callback`.
   3. Copia el ID de cliente y el secreto en **Supabase → Authentication → Providers → Google**.

## 3. Cloudflare Pages (la página web)

1. **Workers & Pages → Create → Pages → Connect to Git**, y elige el repositorio `armario`.
2. Rama de producción: `main`. Comando de build: `npm run build`. Carpeta de salida: `dist`.
3. Variables de entorno:
   - `NODE_VERSION` = `22`
   - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`: en Supabase → **Connect** (la clave «anon» o «publishable», nunca la «service_role»).
   - `VITE_YAPE_NUMERO`: tu número de Yape.
   - `VITE_WHATSAPP_NUMERO`: tu WhatsApp con código de país, sin «+» (por ejemplo `51999888777`).
4. Reemplaza `public/yape-qr.png` por la imagen de tu QR de Yape.

## 4. Tu cuenta de administrador y los respaldos

1. Entra una vez a la app con tu correo. Luego, en **Supabase → SQL Editor** del proyecto real:

   ```sql
   update perfiles set es_admin = true
   where id = (select id from auth.users where email = '<tu-correo>');
   ```

2. Configura los respaldos siguiendo `docs/respaldo.md`.

## 5. Verificación en producción

En un Android y en un iPhone:

- [ ] Entrar con Google (y con código por correo, si ya tienes dominio).
- [ ] Subir 3 prendas reales y ver que se clasifican.
- [ ] Pedir un outfit, guardarlo y planificarlo.
- [ ] Hacer un pago de prueba de S/9.90 y aprobarlo desde el panel (Cuenta → Panel de administrador).
- [ ] Instalar la app en el celular.

## 6. Prueba de calidad de la IA

Con un armario real, haz 20 pedidos variados y califica cada outfit como bueno, regular o malo.
La meta: al menos 15 de los 20 pedidos con 2 o más outfits «buenos». Si no se llega, cambia el modelo y repite:

```bash
npx supabase secrets set IA_MODELO=claude-sonnet-5-5
```

## Para desarrollar en tu computadora

```bash
npm install
```

```bash
npx supabase start
```

```bash
npm run env:local
```

```bash
npm run dev
```

La app queda en `http://127.0.0.1:5173/app/` y los correos de prueba llegan a `http://127.0.0.1:54324`.
