# Armario virtual — Documento de diseño

- **Fecha:** 2026-11-07
- **Estado:** aprobado por secciones; pendiente de revisión final del documento
- **Repositorio:** `ayudape-t/armario`

## 1. Objetivo

Una aplicación web, instalable en el celular, que funciona como armario virtual:

- Guarda y ordena prendas y accesorios por categoría.
- El cliente agrega una prenda con solo tomarle una foto; la IA la clasifica sola.
- Una agenda para planificar qué ponerse cada día.
- La IA arma outfits **solo cuando el cliente lo pide**, según ocasión, tema, formal o informal, colores (neutros o llamativos) y clima. La IA no es un chat y no habla de otros temas.

**Clientes:** personas en Perú. Cobro en soles, solo por Yape.

**Criterios de éxito:**

- Un cliente nuevo ve su primer outfit en menos de 5 minutos desde que se registra.
- En la prueba de calidad (sección 6.5), al menos 15 de 20 pedidos tienen 2 o más outfits calificados como «buenos».
- Unos 10 clientes Premium al mes cubren el costo fijo.

## 2. Arquitectura

```
Celular / navegador
  └─ App web instalable (React + Vite + TypeScript)  ← Cloudflare Pages (gratis)
        │
        ├─ Supabase (región São Paulo)
        │    ├─ Login: Google y correo con código de 6 dígitos
        │    ├─ Base de datos Postgres con reglas por fila (RLS)
        │    ├─ Almacenamiento privado de fotos
        │    └─ Funciones de servidor: clasificar-prenda, sugerir-outfit, borrar-cuenta
        │              └─ Claude Haiku 5.5 (API de Anthropic)
        │
        └─ Pago: el cliente yapea a tu número; tú apruebas en el panel de administrador
```

**Decisiones:**

| Pieza | Elección | Motivo |
|---|---|---|
| App | React 19 + Vite + TypeScript, PWA con `vite-plugin-pwa` | Next.js en Cloudflare necesita un adaptador problemático; casi todo está detrás del login. |
| Página de inicio, Términos y Privacidad | HTML estático (`index.html`, `terminos.html`, `privacidad.html`) | Google la encuentra sin ejecutar JavaScript. La app vive en `/app`. |
| Estilos | CSS propio con variables, sin librería de componentes | Pocas pantallas; nada que justifique una dependencia. |
| Hosting | Cloudflare Pages | Gratis, permite uso comercial, publica solo en cada cambio de `main`. |
| Backend | Supabase | Login, base de datos, fotos y funciones en un solo servicio. |
| IA | `claude-haiku-5-5` con salida estructurada (`output_config.format`) | Muy barato; siempre devuelve JSON válido. El modelo es una variable de entorno para poder pasar a `claude-sonnet-5-5`. |
| Clima | Lo elige el cliente en el formulario | Sin servicio externo; el cliente sabe si sale de noche o va a un lugar cerrado. |
| Pagos | Yape manual con panel de administrador | Sin RUC ni comisión al inicio. Culqi queda para cuando haya RUC. |

**Claves:** la clave de Anthropic vive solo en los secretos de Supabase. La app solo lleva la clave pública de Supabase, que no da acceso a nada sin las reglas de la base de datos.

## 3. Pantallas y recorrido

### 3.1 Páginas públicas

- **Inicio (`/`):** qué hace la app, 3 capturas, precios y el botón «Empezar gratis».
- **Entrar (`/app/entrar`):** botón de Google, o correo con código de 6 dígitos (no enlace: en iPhone el enlace abriría Safari en vez de la app instalada).
- **Términos (`/terminos`) y Privacidad (`/privacidad`):** obligatorios para el login con Google y para la ley de datos personales.

### 3.2 La app: barra inferior con 4 pestañas

1. **Armario** (pantalla principal)
   - Cuadrícula de fotos con filtros por categoría.
   - Contador «32 de 50» en el plan gratis.
   - Botón **+**: cámara o galería, varias fotos a la vez. Cada foto muestra «Analizando…» mientras espera a la IA.
   - **Detalle de prenda:** foto grande, ficha editable y botón para borrar.
   - Si hay prendas sin clasificar (la IA falló), aparecen marcadas para que el cliente elija la categoría.
2. **Outfit**
   - Formulario: ocasión, tema, formal o informal, colores y clima (sección 5.2).
   - Resultado: 3 outfits con las fotos de sus prendas, título y una frase.
   - Acciones en cada outfit: **Guardar** y **Planificar** (guarda y lo pone en un día).
   - Botón **Otra vez**: pide 3 outfits nuevos sin repetir los anteriores (cuenta como un pedido).
   - Contador «2 de 3 hoy» en el plan gratis.
   - Sección **Guardados** con los outfits guardados.
3. **Plan (agenda)**
   - La semana día por día; en cada día se pone un outfit guardado (uno por día).
   - En la pantalla Armario, si hay outfit para hoy: «Hoy: …».
4. **Cuenta**
   - Plan actual y fecha de vencimiento, uso del día, botón «Pasar a Premium».
   - Cerrar sesión y **Borrar cuenta** (con confirmación).

**Ventana de Premium:** aparece al intentar agregar la prenda 51 o pedir el 4.º outfit del día en el plan gratis.

**Avisos:**
- Durante la prueba: «Te quedan X días de Premium gratis».
- 3 días antes de vencer cualquier Premium: «Tu Premium vence el DD/MM. Renuévalo aquí».

### 3.3 Panel de administrador (`/app/admin`, solo tu cuenta)

1. **Pagos en revisión:** cliente (correo), pase, monto, número de operación y fecha, con **Aprobar** y **Rechazar**.
2. **Regalar Premium:** buscar un cliente por correo y darle N días.

### 3.4 Recorrido de un cliente nuevo

1. Página de inicio → «Empezar gratis» → entra con Google (2 toques). Recibe 7 días de Premium gratis.
2. Una pantalla de bienvenida le pide fotos de al menos 5 prendas; las sube de una vez.
3. Cuando la IA termina de clasificarlas, se le invita a pedir su primer outfit.
4. Al guardar su primer outfit aparece «Instala la app en tu celular». En iPhone se explica «Compartir → Agregar a inicio».
5. Día a día: pide outfits o mira su agenda. Al tocar un límite, ve la ventana de Premium.

## 4. Base de datos

Todas las tablas tienen RLS activado. `usuario_id` referencia a `auth.users(id)` con `on delete cascade`.

### 4.1 Tablas

**`perfiles`** — una fila por cuenta, creada por un trigger al registrarse.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | = `auth.users.id` |
| `nombre` | text | editable por el dueño |
| `es_admin` | boolean, default false | solo se cambia por SQL directo |
| `premium_hasta` | timestamptz | el trigger de registro pone `now() + 7 días` (prueba gratis) |
| `creado_en` | timestamptz | |

Premium está activo si `premium_hasta > now()`.

**`prendas`**

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `usuario_id` | uuid | |
| `foto_path` | text | `{usuario_id}/{uuid}.webp` en el bucket `prendas`; la miniatura es la misma ruta terminada en `_mini.webp` |
| `estado` | text: `lista` \| `sin_clasificar` | `sin_clasificar` cuando la IA falló |
| `categoria` | text: `arriba` \| `abajo` \| `vestido` \| `calzado` \| `abrigo` \| `accesorio`, nullable | null solo si `sin_clasificar` |
| `tipo` | text, máx. 40 | «polo», «jean»… |
| `colores` | text[], 1 a 3 valores de la paleta (5.1) | |
| `formalidad` | text: `formal` \| `informal` \| `ambas` | |
| `calidez` | text: `ligera` \| `media` \| `abrigada` | qué tan abrigada es |
| `creado_en` | timestamptz | |

En `sin_clasificar` los campos de la ficha pueden ser null; un `check` exige `categoria` cuando `estado = lista`.

**`outfits`** (guardados) y **`outfit_prendas`**

| `outfits` | Tipo |
|---|---|
| `id` | uuid, PK |
| `usuario_id` | uuid |
| `titulo` | text, máx. 60 |
| `frase` | text, máx. 200 |
| `creado_en` | timestamptz |

`outfit_prendas(outfit_id, prenda_id)`: PK compuesta, ambas FK con `on delete cascade`. Si se borra una prenda, desaparece de los outfits y el resto se mantiene.

**`agenda`**

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `usuario_id` | uuid | |
| `fecha` | date | único por (`usuario_id`, `fecha`) |
| `outfit_id` | uuid | FK a `outfits`, `on delete cascade` |

**`uso_ia`** — un registro por uso de la IA; sirve para contar los límites diarios.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `usuario_id` | uuid | |
| `tipo` | text: `clasificar` \| `outfit` | `clasificar`: cada llamada, salga como salga. `outfit`: solo pedidos exitosos. |
| `creado_en` | timestamptz | |

**`pases`** — catálogo de precios, legible por todos.

| `id` | `nombre` | `dias` | `precio` (S/) |
|---|---|---|---|
| `1m` | 1 mes | 30 | 9.90 |
| `3m` | 3 meses | 90 | 24.90 |
| `12m` | 12 meses | 365 | 79.90 |

**`pagos`**

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `usuario_id` | uuid | |
| `pase_id` | text, FK a `pases` | |
| `monto` | numeric | lo copia un trigger desde `pases`; el cliente no lo elige |
| `numero_operacion` | text, **único** | solo dígitos, 6 a 20 |
| `estado` | text: `pendiente` \| `aprobado` \| `rechazado`, default `pendiente` | |
| `creado_en`, `revisado_en` | timestamptz | |

Índice único parcial: un solo pago `pendiente` por cliente.

### 4.2 Reglas de acceso (RLS y permisos)

| Tabla | Cliente | Servidor / admin |
|---|---|---|
| `perfiles` | Lee su fila; actualiza solo `nombre` | `premium_hasta` solo por funciones de admin |
| `prendas` | Lee, borra y edita la ficha de las suyas (`categoria`, `tipo`, `colores`, `formalidad`, `calidez`, `estado`) | Solo `clasificar-prenda` inserta |
| `outfits`, `outfit_prendas`, `agenda` | Todo sobre lo suyo; las prendas y outfits enlazados deben ser suyos | — |
| `uso_ia` | Lee los suyos | Solo las funciones de servidor insertan |
| `pases` | Lee | — |
| `pagos` | Lee los suyos; inserta con `estado = pendiente` | Solo funciones de admin cambian el estado |

**Funciones de base de datos para el admin** (`security definer`; fallan si quien llama no tiene `es_admin`):

- `aprobar_pago(pago_id)`: marca `aprobado` y hace `premium_hasta = greatest(now(), premium_hasta) + dias`.
- `rechazar_pago(pago_id)`: marca `rechazado`.
- `regalar_premium(correo, dias)`: suma días igual que al aprobar.
- `pagos_pendientes()`: lista los pagos pendientes con el correo del cliente, para el panel.

### 4.3 Fotos

- **Dónde:** bucket privado `prendas`, una carpeta por cliente. Solo el dueño puede leer y escribir en su carpeta.
- **Subida:** el bucket acepta solo `image/webp`, `image/jpeg` e `image/png`, de hasta 5 MB.
- **Dos tamaños, hechos en la app antes de subir:**
  - grande: 1024 px de lado mayor, WebP (~150 KB), para el detalle y para la IA;
  - miniatura: 300 px, WebP (~20 KB), para la cuadrícula del armario. Así rinde más la descarga del plan gratis.
- **Al borrar una prenda,** la app borra también sus dos fotos.
- **Visualización:** con enlaces firmados que caducan en 1 hora.

### 4.4 Límites

| | Gratis | Premium |
|---|---|---|
| Prendas | 50 | 1,000 (se vende como «sin límite») |
| Pedidos de outfit | 3 al día | 30 al día (se vende como «sin límite») |
| Fotos clasificadas (todos) | 100 al día | 100 al día |

El día se cuenta en hora de Perú (`America/Lima`). Los límites se verifican en las funciones de servidor; la app solo los muestra.

## 5. IA

Las dos tareas corren en funciones de Supabase (Deno) con el SDK oficial `@anthropic-ai/sdk`, modelo `claude-haiku-5-5` y salida estructurada.

### 5.1 `clasificar-prenda`

1. Recibe la ruta de una foto ya subida por el cliente.
2. Verifica: que la foto esté en la carpeta del cliente, el límite de prendas y el límite de 100 fotos al día (registros `clasificar` de hoy en `uso_ia`). Registra el uso en `uso_ia` antes de llamar a la IA.
3. Envía la foto a Claude (esfuerzo `low`) pidiendo esta ficha:
   ```json
   {
     "es_prenda": true,
     "categoria": "arriba | abajo | vestido | calzado | abrigo | accesorio",
     "tipo": "texto corto",
     "colores": ["1 a 3 de la paleta"],
     "formalidad": "formal | informal | ambas",
     "calidez": "ligera | media | abrigada"
   }
   ```
   Paleta: negro, blanco, gris, beige, marrón, azul marino, azul, celeste, verde, rojo, rosado, morado, amarillo, naranja, dorado, plateado, estampado.
4. Resultado:
   - **Es prenda** → inserta la prenda con `estado = lista`.
   - **No es prenda** → borra la foto, responde «No parece una prenda» y no cuenta para el límite.
   - **La IA falla o tarda más de 20 s** → inserta la prenda con `estado = sin_clasificar`; el cliente elige la categoría a mano.

### 5.2 `sugerir-outfit`

**Entrada (validada en el servidor):**

| Campo | Valores |
|---|---|
| `ocasion` | opción de la lista (trabajo, casual, fiesta de noche, cita, matrimonio, deporte, viaje) o texto libre, máx. 80 caracteres |
| `tema` | opcional, máx. 80 caracteres |
| `formalidad` | `formal` \| `informal` |
| `colores` | `neutros` \| `llamativos` \| `da_igual` |
| `clima` | `frio` \| `templado` \| `calor` \| `lluvia` |
| `evitar` | opcional: listas de prendas de outfits ya mostrados (botón «Otra vez») |

**Proceso:**

1. Verifica el límite diario (registros `outfit` de hoy en `uso_ia`).
2. Arma la lista de prendas `lista` del cliente con códigos cortos (`p1`, `p2`…) que el servidor traduce a sus uuid:
   `p12 · vestido · negro · informal · ligera`
3. El texto libre va como dato dentro del mensaje, nunca como instrucción. El mensaje de sistema dice que solo arma outfits con las prendas listadas.
4. Pide a Claude (esfuerzo `medium`) esta respuesta:
   ```json
   {
     "fuera_de_tema": false,
     "faltan": "texto o null",
     "outfits": [
       { "titulo": "máx. 60", "frase": "máx. 200", "prendas": ["p12", "p31", "p7"] }
     ]
   }
   ```
5. **Validación:** cada código debe existir en el armario del cliente y cada outfit debe tener de 2 a 6 prendas. Los outfits inválidos se descartan.
6. **Resultado:**
   - `fuera_de_tema` → «Solo puedo armar outfits».
   - Sin outfits válidos y sin `faltan` → se reintenta una vez; si vuelve a fallar, sale un error y no se descuenta.
   - Éxito → registra `outfit` en `uso_ia` y devuelve los outfits con los uuid de las prendas.

### 5.3 Control de gastos

- Tope de gasto mensual en la cuenta de Anthropic: US$20.
- Costo estimado con Haiku 5.5 (US$0.10 entrada / US$0.50 salida por millón de tokens):
  - clasificar una foto ≈ US$0.0003;
  - pedido de outfits con ~150 prendas ≈ US$0.001;
  - peor caso de un cliente Premium (30 pedidos al día) ≈ US$1 al mes.

## 6. Planes, pagos y lanzamiento

### 6.1 Planes

| | Gratis | Premium |
|---|---|---|
| Prendas | 50 | sin límite (tope 1,000) |
| Pedidos de outfit | 3 al día | sin límite (tope 30 al día) |
| Clasificación de fotos, agenda, guardados | ✓ | ✓ |

**Prueba gratis:** 7 días de Premium al registrarse, una vez por cuenta.

### 6.2 Pago con Yape (manual)

1. El cliente elige un pase → la app muestra tu QR de Yape, tu número y el monto exacto.
2. Yapea y escribe el número de operación → el pago queda «En revisión».
3. Botón «Avisar por WhatsApp»: abre `wa.me/<tu número>` con un mensaje listo (correo, pase, monto y número de operación).
4. En el panel apruebas o rechazas. Al aprobar, Premium se activa y los días se suman si aún le quedaban.

**Reglas del pago:**
- Un solo pago pendiente por cliente.
- Un número de operación no se puede usar dos veces.
- Si se rechaza, el cliente ve «Revisa tu número de operación» y puede reintentar.
- Devoluciones a mano por Yape, según los Términos.

**Configuración** (variables de la app, no código): imagen del QR de Yape, número de Yape y número de WhatsApp.

### 6.3 Cuando vence Premium

Vuelve al plan gratis sin perder nada:
- Si tiene más de 50 prendas, puede verlas, editarlas y usarlas en outfits, pero no agregar nuevas.
- Vuelve a tener 3 pedidos de outfit al día.

### 6.4 Lanzamiento

1. **Beta cerrada:** tu esposa y ~10 amigas, con Premium regalado desde el panel y sin cobrar.
2. **Lanzamiento:** se activan los pases y se publica la página de inicio. Se sigue en el **plan gratis de Supabase**.
3. **Paso a Supabase Pro** (un botón en el panel, sin cambios de código), cuando se cumpla lo primero de:
   - unos 10 clientes Premium, que cubren los US$25 al mes;
   - fotos cerca de 1 GB o descarga cerca de 5 GB al mes (se ve en el panel de Supabase).

   Estimado: el plan gratis aguanta unos 100 a 150 clientes activos.

### 6.5 Prueba de calidad de la IA (antes de lanzar)

1. Se carga un armario real y se hacen 20 pedidos variados.
2. Cada outfit se califica como bueno, regular o malo.
3. **Meta:** al menos 15 de los 20 pedidos con 2 o más outfits «buenos».
4. Si Haiku 5.5 no llega a la meta, se repiten los mismos 20 pedidos con `claude-sonnet-5-5`.

## 7. Seguridad, errores y pruebas

### 7.1 Seguridad

- **Datos:** RLS en todas las tablas y carpetas privadas por cliente (sección 4).
- **Claves:** la clave de Anthropic, solo en los secretos de Supabase.
- **Administrador:** `es_admin` se activa solo por SQL directo.
- **Validación en el servidor:** largos de texto, valores permitidos, formato del número de operación, tipo y tamaño de imagen, límites diarios.
- **IA:** salida estructurada, texto del cliente tratado como dato y verificación de prendas (sección 5).
- **Copia de seguridad diaria:** una tarea programada de GitHub Actions exporta la base de datos cada noche, la cifra con una contraseña guardada como secreto de GitHub y la conserva 90 días. Va cifrada porque el repositorio es público. Las fotos no se copian (Supabase Pro tampoco las copia).
- **Borrar cuenta (`borrar-cuenta`):** borra la carpeta de fotos y luego el usuario de `auth`; el resto se borra en cascada.
- **Ley de datos personales (Ley 29733):** política de privacidad, aceptación al registrarse, borrar cuenta e inscripción del banco de datos ante la Autoridad de Protección de Datos Personales (trámite del dueño). La política indica que las fotos pasan por Anthropic solo para clasificarlas.

### 7.2 Errores

| Situación | Lo que ve el cliente |
|---|---|
| Sin internet | «Sin conexión. Inténtalo cuando tengas señal.» |
| Falla la subida de una foto | La foto queda en pantalla con «Reintentar» |
| La IA no clasifica | La prenda se guarda como «sin clasificar» para elegir la categoría a mano |
| La IA no arma outfits | «No pudimos armar tus outfits, inténtalo de nuevo» (no se descuenta) |
| Llegó al límite gratis | Ventana de Premium |
| Pago rechazado | «Revisa tu número de operación» |

Los errores de las funciones quedan en los registros de Supabase.

### 7.3 Pruebas

**Automáticas:**

1. **Base de datos** (`supabase test db`, pgTAP):
   - un cliente no lee ni modifica datos de otro;
   - nadie se da Premium ni aprueba pagos sin `es_admin`;
   - el número de operación es único y hay un solo pago pendiente por cliente;
   - el monto del pago sale de `pases`;
   - la prueba de 7 días se crea al registrarse;
   - al aprobar un pago se suman los días;
   - al borrar una prenda se limpian sus enlaces en `outfit_prendas`.
2. **Funciones de servidor** (pruebas de Deno, con la IA simulada):
   - se respetan los límites;
   - una foto que no es prenda no cuenta;
   - un fallo de la IA deja la prenda como `sin_clasificar`;
   - se descartan los códigos inventados;
   - un pedido fallido no se descuenta;
   - `fuera_de_tema` responde lo esperado.
3. **Recorridos completos** (Playwright):
   - registro → subir prenda → pedir outfit → guardar → planificar;
   - pago → aprobación en el panel → Premium activo.

**A mano:**
- Prueba de calidad de la IA (6.5).
- Celulares reales, Android con Chrome e iPhone con Safari: instalar la app, usar la cámara y subir varias fotos.

**Publicación:**
- Cloudflare publica cada cambio en `main`.
- Hay un proyecto de Supabase de pruebas, separado del real.

## 8. Costos

| Etapa | Costo |
|---|---|
| Desarrollo, beta y lanzamiento | US$0 al mes (plan gratis de Supabase), más una recarga inicial de ~US$5 en Anthropic |
| Al crecer (sección 6.4) | US$25 al mes (Supabase Pro) |
| Dominio | Opcional, ~US$10 al año |
| IA | Centavos según el uso; tope de US$20 al mes |
| Cobros | Sin comisión con Yape personal (Yape Empresa cobra 2.95% solo por encima de ~5 UIT al mes) |

Punto de equilibrio: ~10 pases de S/9.90 al mes.

## 9. Fuera de la primera versión

- Armar outfits a mano.
- Estadísticas de uso.
- Compartir outfits.
- Modo oscuro.
- Inglés.
- Modo sin internet.
- Alertas de errores externas (Sentry).
- Botones 👍/👎 en los outfits.
- Correo al aprobar un pago.
- Clima automático por ubicación.
- Pago con tarjeta o Culqi (cuando haya RUC).
- Quitar el fondo de las fotos.

## 10. Pendientes del dueño (fuera del código)

- Crear las cuentas de Supabase, Cloudflare y Anthropic, y poner el tope de gasto en Anthropic.
- Configurar el login con Google en Google Cloud: pantalla de consentimiento con los enlaces a Inicio y Privacidad.
- Entregar la imagen del QR de Yape, el número de Yape y el número de WhatsApp.
- Confirmar con un comprobante real el formato del número de operación de Yape (hoy: solo dígitos, 6 a 20).
- Revisar los textos de Términos y Privacidad (yo preparo un borrador; conviene una revisión legal).
- Inscribir el banco de datos personales ante la autoridad.
- Guardar en GitHub (Settings → Secrets) la conexión a la base de datos y la contraseña de las copias de seguridad.
- Decidir si el repositorio pasa a privado. Hoy es público: cualquiera puede ver y copiar el código (nunca habrá claves en él).
- Dominio propio (opcional).
