import { describe, expect, test, vi } from 'vitest';
import { procesarClasificacion, type DepsClasificar } from './clasificar.ts';

const UID = '11111111-1111-1111-1111-111111111111';
const RUTA = `${UID}/22222222-2222-2222-2222-222222222222.webp`;
const FICHA = {
  es_prenda: true,
  categoria: 'vestido' as const,
  tipo: 'vestido',
  colores: ['negro' as const],
  formalidad: 'informal' as const,
  calidez: 'ligera' as const,
};

function deps(cambios: Partial<DepsClasificar> = {}) {
  const orden: string[] = [];
  const d: DepsClasificar = {
    estadoLimites: vi.fn(async () => ({ prendas: 0, max_prendas: 50, clasificaciones_hoy: 0, max_clasificaciones: 100 })),
    registrarUso: vi.fn(async () => void orden.push('uso')),
    descargarFoto: vi.fn(async () => new Uint8Array([1, 2, 3])),
    borrarFotos: vi.fn(async () => {}),
    insertarPrenda: vi.fn(async () => ({ id: 'prenda-1' })),
    clasificarConIA: vi.fn(async () => (orden.push('ia'), FICHA)),
    ...cambios,
  };
  return { d, orden };
}

describe('procesarClasificacion', () => {
  test('rechaza rutas fuera de la carpeta del cliente', async () => {
    const { d } = deps();
    for (const ruta of [`otro/${RUTA.split('/')[1]}`, `${UID}/../x.webp`, `${UID}/abc_mini.webp`]) {
      expect(await procesarClasificacion(d, UID, ruta)).toEqual({ ok: false, error: 'ruta_invalida' });
    }
    expect(d.estadoLimites).not.toHaveBeenCalled();
  });

  test('con 49 prendas deja agregar; con 50 muestra el límite sin gastar IA', async () => {
    const con49 = deps({ estadoLimites: vi.fn(async () => ({ prendas: 49, max_prendas: 50, clasificaciones_hoy: 0, max_clasificaciones: 100 })) });
    expect((await procesarClasificacion(con49.d, UID, RUTA)).ok).toBe(true);
    const con50 = deps({ estadoLimites: vi.fn(async () => ({ prendas: 50, max_prendas: 50, clasificaciones_hoy: 0, max_clasificaciones: 100 })) });
    expect(await procesarClasificacion(con50.d, UID, RUTA)).toEqual({ ok: false, error: 'limite_prendas' });
    expect(con50.d.registrarUso).not.toHaveBeenCalled();
    expect(con50.d.clasificarConIA).not.toHaveBeenCalled();
  });

  test('100 fotos en el día frena sin gastar IA', async () => {
    const { d } = deps({ estadoLimites: vi.fn(async () => ({ prendas: 3, max_prendas: 50, clasificaciones_hoy: 100, max_clasificaciones: 100 })) });
    expect(await procesarClasificacion(d, UID, RUTA)).toEqual({ ok: false, error: 'limite_fotos' });
    expect(d.clasificarConIA).not.toHaveBeenCalled();
  });

  test('registra el uso antes de llamar a la IA', async () => {
    const { d, orden } = deps();
    await procesarClasificacion(d, UID, RUTA);
    expect(orden).toEqual(['uso', 'ia']);
  });

  test('si no es una prenda borra las fotos y no guarda nada', async () => {
    const { d } = deps({ clasificarConIA: vi.fn(async () => ({ ...FICHA, es_prenda: false })) });
    expect(await procesarClasificacion(d, UID, RUTA)).toEqual({ ok: false, error: 'no_es_prenda' });
    expect(d.borrarFotos).toHaveBeenCalledWith(RUTA);
    expect(d.insertarPrenda).not.toHaveBeenCalled();
  });

  test('si la IA falla guarda la prenda sin clasificar', async () => {
    const { d } = deps({ clasificarConIA: vi.fn(async () => { throw new Error('timeout'); }) });
    expect(await procesarClasificacion(d, UID, RUTA)).toEqual({ ok: true, prenda_id: 'prenda-1', estado: 'sin_clasificar' });
    expect(d.insertarPrenda).toHaveBeenCalledWith({
      usuario_id: UID, foto_path: RUTA, estado: 'sin_clasificar',
      categoria: null, tipo: null, colores: null, formalidad: null, calidez: null,
    });
  });

  test('si la IA responde guarda la prenda lista con su ficha', async () => {
    const { d } = deps();
    expect(await procesarClasificacion(d, UID, RUTA)).toEqual({ ok: true, prenda_id: 'prenda-1', estado: 'lista' });
    expect(d.insertarPrenda).toHaveBeenCalledWith({
      usuario_id: UID, foto_path: RUTA, estado: 'lista',
      categoria: 'vestido', tipo: 'vestido', colores: ['negro'], formalidad: 'informal', calidez: 'ligera',
    });
  });

  test('una foto .jpg se envía como image/jpeg y una .webp como image/webp', async () => {
    const jpg = deps();
    await procesarClasificacion(jpg.d, UID, RUTA.replace('.webp', '.jpg'));
    expect(jpg.d.clasificarConIA).toHaveBeenCalledWith(expect.any(Uint8Array), 'image/jpeg');
    const webp = deps();
    await procesarClasificacion(webp.d, UID, RUTA);
    expect(webp.d.clasificarConIA).toHaveBeenCalledWith(expect.any(Uint8Array), 'image/webp');
  });
});
