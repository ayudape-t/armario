// Escribe .env.local con los datos del Supabase local (desarrollo y pruebas). Nunca se sube a git.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const env = Object.fromEntries(
  execSync('npx supabase status -o env', { encoding: 'utf8' })
    .split('\n')
    .map((l) => /^([A-Z_]+)="?(.*?)"?$/.exec(l))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
writeFileSync('.env.local', [
  `VITE_SUPABASE_URL=${env.API_URL}`,
  `VITE_SUPABASE_ANON_KEY=${env.ANON_KEY}`,
  'VITE_YAPE_NUMERO=999888777',
  'VITE_WHATSAPP_NUMERO=51999888777',
  '',
].join('\n'));
console.log('.env.local listo');
