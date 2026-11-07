import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { FichaIA, PALETA, type Ficha } from './ficha.ts';

const modelo = () => Deno.env.get('IA_MODELO') ?? 'claude-haiku-5-5';

function base64(bytes: Uint8Array): string {
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}

const INSTRUCCION_FICHA = `Mira la foto y llena la ficha de la prenda o accesorio.
- es_prenda: false si la foto no muestra ropa, calzado ni un accesorio de vestir.
- categoria: arriba (polos, blusas, camisas, chompas), abajo (pantalones, faldas, shorts), vestido (vestidos y enterizos), calzado, abrigo (casacas, abrigos, blazers), accesorio (carteras, joyas, cinturones, sombreros).
- tipo: nombre corto en español del Perú, por ejemplo «polo», «jean», «botines».
- colores: de 1 a 3, solo de esta lista: ${PALETA.join(', ')}.
- formalidad: formal, informal o ambas.
- calidez: ligera, media o abrigada.`;

/** Lanza si la IA falla, se niega o tarda más de 20 s. */
export async function clasificarConIA(foto: Uint8Array, tipoMime: string): Promise<Ficha> {
  const cliente = new Anthropic();
  const r = await cliente.messages.parse(
    {
      model: modelo(),
      max_tokens: 2048,
      output_config: { effort: 'low', format: zodOutputFormat(FichaIA) },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: tipoMime as 'image/webp' | 'image/jpeg', data: base64(foto) } },
          { type: 'text', text: INSTRUCCION_FICHA },
        ],
      }],
    },
    { timeout: 20_000, maxRetries: 0 },
  );
  if (r.stop_reason === 'refusal' || !r.parsed_output) throw new Error(`clasificación sin ficha (${r.stop_reason})`);
  return r.parsed_output;
}
