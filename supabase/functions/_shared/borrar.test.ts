import { expect, test, vi } from 'vitest';
import { borrarCuenta } from './borrar.ts';

function carpeta(n: number) {
  let fotos = Array.from({ length: n }, (_, i) => `u1/f${i}.webp`);
  const orden: string[] = [];
  return {
    orden,
    deps: {
      listarFotos: vi.fn(async (_uid: string, offset: number) => fotos.slice(offset, offset + 1000)),
      borrarRutas: vi.fn(async (rutas: string[]) => {
        orden.push('fotos');
        fotos = fotos.filter((f) => !rutas.includes(f));
      }),
      borrarUsuario: vi.fn(async () => void orden.push('usuario')),
    },
  };
}

test('borra todas las fotos por páginas y recién después el usuario', async () => {
  const { deps, orden } = carpeta(2300);
  await borrarCuenta(deps, 'u1');
  expect(deps.borrarRutas).toHaveBeenCalledTimes(3);
  expect(orden).toEqual(['fotos', 'fotos', 'fotos', 'usuario']);
});

test('si no se pueden borrar las fotos no borra el usuario', async () => {
  const { deps } = carpeta(10);
  deps.borrarRutas.mockRejectedValueOnce(new Error('almacenamiento caído'));
  await expect(borrarCuenta(deps, 'u1')).rejects.toThrow();
  expect(deps.borrarUsuario).not.toHaveBeenCalled();
});

test('si las fotos no desaparecen no se queda en un bucle infinito', async () => {
  const { deps } = carpeta(10);
  deps.borrarRutas.mockImplementation(async () => {});
  await expect(borrarCuenta(deps, 'u1')).rejects.toThrow('no se pudieron borrar las fotos');
  expect(deps.borrarUsuario).not.toHaveBeenCalled();
});
