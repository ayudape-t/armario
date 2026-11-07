#!/usr/bin/env bash
# Exporta los datos (tablas públicas + cuentas) y los cifra. No imprime datos.
# Uso: RESPALDO_CLAVE=... bash scripts/respaldo.sh <db_url> <salida.sql.gpg>
set -euo pipefail
url="${1:?Falta la URL de la base de datos}"
salida="${2:?Falta el archivo de salida}"
: "${RESPALDO_CLAVE:?Falta RESPALDO_CLAVE}"

# --inserts + --on-conflict-do-nothing: se puede restaurar sobre una base con las migraciones ya aplicadas.
docker run --rm --network host postgres:17 pg_dump "$url" \
  --data-only --inserts --on-conflict-do-nothing \
  -t 'public.*' -t auth.users -t auth.identities \
  | gpg --batch --yes --pinentry-mode loopback --passphrase-fd 3 --symmetric --cipher-algo AES256 -o "$salida" 3<<<"$RESPALDO_CLAVE"
echo "Respaldo cifrado en $salida"
