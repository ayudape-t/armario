# Copias de seguridad

Cada noche (03:00, hora de Perú) GitHub copia la base de datos, la **cifra con una contraseña** y la guarda 90 días.
Se copian las prendas (sus fichas), outfits, agenda, pagos, perfiles y cuentas. **Las fotos no se copian.**

## Ponerlo en marcha (una sola vez)

1. En Supabase, abre tu proyecto → botón **Connect** → copia la cadena de conexión **Session pooler** (empieza con `postgresql://`) y reemplaza `[YOUR-PASSWORD]` por la contraseña de la base de datos.
2. Inventa una contraseña larga para cifrar los respaldos y **guárdala en un lugar seguro**. Sin ella, los respaldos no se pueden abrir.
3. En GitHub, en el repositorio: **Settings → Secrets and variables → Actions → New repository secret**, y crea dos secretos:
   - `SUPABASE_DB_URL`: la cadena del paso 1.
   - `RESPALDO_CLAVE`: la contraseña del paso 2.
4. Pruébalo: **Actions → Respaldo diario → Run workflow**. Al terminar, el archivo aparece en **Artifacts** de esa ejecución.

> GitHub pausa las tareas programadas de un repositorio sin cambios durante 60 días. Si pasa, vuelve a activarla desde **Actions**.

## Restaurar un respaldo

Necesitas una computadora con Docker y `gpg`.

1. Descarga el respaldo desde **Actions → Respaldo diario → (la ejecución) → Artifacts** y descomprime el `.zip`.
2. Si es un proyecto nuevo de Supabase, primero crea las tablas:

   ```bash
   npx supabase link --project-ref <ref-del-proyecto>
   npx supabase db push
   ```

3. Restaura:

   ```bash
   RESPALDO_CLAVE='la-contraseña' bash scripts/restaurar.sh respaldo-AAAA-MM-DD.sql.gpg "<cadena Session pooler>"
   ```

Los datos que ya existan se respetan (no se duplican) y el Premium de cada cliente queda tal como estaba en el respaldo.
