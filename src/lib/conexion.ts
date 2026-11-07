export const MENSAJE_SIN_CONEXION = 'Sin conexión. Inténtalo cuando tengas señal.';

export function sinConexion(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  return e instanceof TypeError && /fetch|network|load failed/i.test(e.message);
}
