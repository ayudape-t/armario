// Servidor falso de la API de Anthropic para pruebas: node e2e/ia-falsa.mjs [puerto]
import { createServer } from 'node:http';

const puerto = Number(process.argv[2] ?? 8787);
const TITULOS = ['Noche con brillo', 'Abrigada y cómoda', 'Toque dorado'];
const FRASES = [
  'El negro con un detalle de color resalta de noche.',
  'Una capa abrigadora te cubre del frío sin perder estilo.',
  'Un accesorio llamativo levanta un look sencillo.',
];

function respuesta(body) {
  const contenido = body.messages.flatMap((m) => (Array.isArray(m.content) ? m.content : [{ type: 'text', text: m.content }]));
  if (contenido.some((c) => c.type === 'image')) {
    return { es_prenda: true, categoria: 'vestido', tipo: 'vestido', colores: ['negro'], formalidad: 'informal', calidez: 'ligera' };
  }
  const texto = contenido.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  const codigos = [...new Set(texto.match(/\bp\d+\b/g) ?? [])];
  if (codigos.length < 2) return { fuera_de_tema: false, faltan: 'Agrega más prendas', outfits: [] };
  const par = (i) => [codigos[i % codigos.length], codigos[(i + 1) % codigos.length]];
  return {
    fuera_de_tema: false,
    faltan: null,
    outfits: [0, 1, 2].map((i) => ({ titulo: TITULOS[i], frase: FRASES[i], prendas: par(i) })),
  };
}

createServer((req, res) => {
  let datos = '';
  req.on('data', (c) => (datos += c));
  req.on('end', () => {
    if (req.method !== 'POST' || !req.url?.startsWith('/v1/messages')) {
      res.writeHead(404).end();
      return;
    }
    const body = JSON.parse(datos);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      id: 'msg_falso', type: 'message', role: 'assistant', model: body.model,
      content: [{ type: 'text', text: JSON.stringify(respuesta(body)) }],
      stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
    }));
  });
}).listen(puerto, '0.0.0.0', () => console.log(`IA falsa en :${puerto}`));
