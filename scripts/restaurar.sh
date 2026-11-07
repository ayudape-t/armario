#!/usr/bin/env bash
# Restaura un respaldo cifrado sobre una base con las migraciones ya aplicadas (npx supabase db push).
# Uso: RESPALDO_CLAVE=... bash scripts/restaurar.sh <respaldo.sql.gpg> <db_url>
set -euo pipefail
archivo="${1:?Falta el archivo del respaldo}"
url="${2:?Falta la URL de la base de datos}"
: "${RESPALDO_CLAVE:?Falta RESPALDO_CLAVE}"

# session_replication_role = replica: no corren los triggers (no se recrean perfiles ni se pisa el Premium).
gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 3 --decrypt "$archivo" 3<<<"$RESPALDO_CLAVE" \
  | docker run --rm -i --network host postgres:17 psql "$url" -q -v ON_ERROR_STOP=1 --single-transaction \
      -c 'SET session_replication_role = replica' -f -
echo "Respaldo restaurado"
