export type DepsBorrar = {
  listarFotos(uid: string, offset: number): Promise<string[]>;
  borrarRutas(rutas: string[]): Promise<void>;
  borrarUsuario(uid: string): Promise<void>;
};

const MAX_PAGINAS = 20; // 20.000 archivos: muy por encima del tope Premium

/** Vacía la carpeta de fotos (de 1000 en 1000) y solo entonces borra el usuario; sus filas caen en cascada. */
export async function borrarCuenta(deps: DepsBorrar, uid: string): Promise<void> {
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const rutas = await deps.listarFotos(uid, 0);
    if (rutas.length === 0) {
      await deps.borrarUsuario(uid);
      return;
    }
    await deps.borrarRutas(rutas);
  }
  throw new Error('no se pudieron borrar las fotos');
}
