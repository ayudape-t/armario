import { expect, test, vi } from 'vitest';
import { MENSAJE_SIN_CONEXION } from './conexion';
import { subirPrenda, type DepsSubida } from './subida';

const archivo = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
function deps(clasificar: DepsSubida['clasificar']): DepsSubida {
  return {
    preparar: vi.fn(async () => ({ grande: new Blob(['g']), mini: new Blob(['m']), ext: 'webp' as const })),
    subirArchivo: vi.fn(async () => ({ error: null })),
    clasificar: vi.fn(clasificar),
    borrar: vi.fn(async () => {}),
    nuevoId: () => 'id-1',
  };
}

test('sin conexión al clasificar conserva las fotos y devuelve la ruta para reintentar', async () => {
  const d = deps(async () => ({ ok: false, error: 'sin_conexion', status: 0 }));
  expect(await subirPrenda(d, 'u1', archivo)).toEqual({ estado: 'error', mensaje: MENSAJE_SIN_CONEXION, ruta: 'u1/id-1.webp' });
  expect(d.borrar).not.toHaveBeenCalled();
});

test('reintentar con la ruta anterior no vuelve a subir la foto', async () => {
  const d = deps(async () => ({ ok: true, data: { estado: 'lista' as const } }));
  expect(await subirPrenda(d, 'u1', archivo, 'u1/id-0.webp')).toEqual({ estado: 'lista' });
  expect(d.preparar).not.toHaveBeenCalled();
  expect(d.subirArchivo).not.toHaveBeenCalled();
  expect(d.clasificar).toHaveBeenCalledWith('u1/id-0.webp');
});

test('al llegar al límite borra las fotos subidas', async () => {
  const d = deps(async () => ({ ok: false, error: 'limite_prendas', status: 403 }));
  expect(await subirPrenda(d, 'u1', archivo)).toEqual({ estado: 'limite' });
  expect(d.borrar).toHaveBeenCalledWith('u1/id-1.webp');
});
