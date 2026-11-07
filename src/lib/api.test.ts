import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { expect, test, vi } from 'vitest';
import { llamarFuncion } from './api';
import { sinConexion } from './conexion';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('./supabase', () => ({ supabase: { functions: { invoke } } }));

test('llamarFuncion devuelve el error de la función con su código HTTP', async () => {
  invoke.mockResolvedValueOnce({
    data: null,
    error: new FunctionsHttpError(new Response(JSON.stringify({ error: 'limite_prendas' }), { status: 403 })),
    response: undefined,
  } as never);
  expect(await llamarFuncion('clasificar-prenda', { ruta: 'x' })).toEqual({ ok: false, error: 'limite_prendas', status: 403 });
});

test('llamarFuncion marca la falta de red como sin_conexion', async () => {
  invoke.mockResolvedValueOnce({
    data: null, error: new FunctionsFetchError(new TypeError('Failed to fetch')), response: undefined,
  } as never);
  expect(await llamarFuncion('sugerir-outfit', {})).toEqual({ ok: false, error: 'sin_conexion', status: 0 });
});

test('llamarFuncion devuelve los datos cuando sale bien', async () => {
  invoke.mockResolvedValueOnce({ data: { estado: 'lista' }, error: null, response: undefined } as never);
  expect(await llamarFuncion('clasificar-prenda', { ruta: 'x' })).toEqual({ ok: true, data: { estado: 'lista' } });
});

test('sinConexion reconoce errores de red', () => {
  expect(sinConexion(new TypeError('Failed to fetch'))).toBe(true);
  expect(sinConexion(new Error('otra cosa'))).toBe(false);
});
