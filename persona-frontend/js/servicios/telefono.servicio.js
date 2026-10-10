/**
 * js/servicios/telefono.servicio.js
 * ---------------------------------------------------------------------
 * SERVICIO de la entidad Telefono (frontend).
 */

import { clienteApi } from './clienteApi.js';

class TelefonoServicio {
  #ruta = '/telefonos';

  /**
   * Lista telefonos con filtros.
   * @param {object} filtros  { usuarioId, activo, tipo, buscar, pagina, limite }
   */
  async listar(filtros = {}) {
    const respuesta = await clienteApi.obtener(this.#ruta, filtros);

    return {
      telefonos: respuesta.datos ?? [],
      meta: respuesta.meta ?? null
    };
  }

  async obtener(id) {
    const respuesta = await clienteApi.obtener(`${this.#ruta}/${id}`);
    return respuesta.datos;
  }

  /** Crea un telefono. `datos` debe incluir usuarioId. */
  async crear(datos) {
    const respuesta = await clienteApi.crear(this.#ruta, datos);
    return respuesta.datos;
  }

  /**
   * Crea un telefono usando la ruta de subrecurso del usuario.
   *
   * Diferencia con crear(): el usuarioId va en la URL, no en el
   * cuerpo. Es la forma mas REST de expresar "crea un telefono
   * PERTENECIENTE A este usuario".
   */
  async crearParaUsuario(usuarioId, datos) {
    const respuesta = await clienteApi.crear(`/usuarios/${usuarioId}/telefonos`, datos);
    return respuesta.datos;
  }

  async actualizar(id, datos) {
    const respuesta = await clienteApi.actualizar(`${this.#ruta}/${id}`, datos);
    return respuesta.datos;
  }

  async eliminar(id) {
    const respuesta = await clienteApi.eliminar(`${this.#ruta}/${id}`);
    return respuesta.datos;
  }

  /**
   * Activa o desactiva un telefono con PATCH.
   *
   * Usa las rutas de accion de la API:
   *   PATCH /api/telefonos/:id/activar
   *   PATCH /api/telefonos/:id/desactivar
   */
  async cambiarEstado(id, activar) {
    const accion = activar ? 'activar' : 'desactivar';
    const respuesta = await clienteApi.modificar(`${this.#ruta}/${id}/${accion}`);
    return respuesta.datos;
  }

  async contar() {
    const respuesta = await clienteApi.obtener(this.#ruta, { limite: 1 });
    return respuesta.meta?.total ?? 0;
  }
}

export const telefonoServicio = new TelefonoServicio();
