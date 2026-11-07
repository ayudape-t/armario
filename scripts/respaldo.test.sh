#!/usr/bin/env bash
# Prueba local: respaldar, borrar todo, restaurar y comprobar. Uso: RESPALDO_CLAVE=prueba bash scripts/respaldo.test.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=$(npx supabase status -o env | sed -n 's/^DB_URL="\(.*\)"$/\1/p')
TMP=$(mktemp -d)
ID=00000000-0000-0000-0000-00000000fade

psql -q "$DB" -v ON_ERROR_STOP=1 <<SQL
delete from auth.users where id = '$ID';
insert into auth.users (id, email) values ('$ID', 'respaldo@prueba.pe');
update public.perfiles set premium_hasta = '2030-01-01T00:00:00Z' where id = '$ID';
insert into public.prendas (usuario_id, foto_path, estado, categoria, tipo) values ('$ID', '$ID/x.webp', 'lista', 'arriba', 'prueba-respaldo');
SQL

bash scripts/respaldo.sh "$DB" "$TMP/respaldo.sql.gpg"
if grep -q 'prueba-respaldo' "$TMP/respaldo.sql.gpg"; then echo 'FALLA: el respaldo no está cifrado'; exit 1; fi

npx supabase db reset > /dev/null 2>&1
bash scripts/restaurar.sh "$TMP/respaldo.sql.gpg" "$DB"

tipo=$(psql -tA "$DB" -c "select tipo from public.prendas where usuario_id = '$ID'")
premium=$(psql -tA "$DB" -c "select premium_hasta = '2030-01-01T00:00:00Z' from public.perfiles where id = '$ID'")
pases=$(psql -tA "$DB" -c "select count(*) from public.pases")
[ "$tipo" = 'prueba-respaldo' ] || { echo "FALLA: la prenda no volvió ($tipo)"; exit 1; }
[ "$premium" = 't' ] || { echo 'FALLA: Premium no se restauró tal cual'; exit 1; }
[ "$pases" = '3' ] || { echo "FALLA: pases duplicados ($pases)"; exit 1; }
rm -rf "$TMP"
echo OK
