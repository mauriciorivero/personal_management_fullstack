/**
 * js/servicios/redSocial.servicio.js
 * ---------------------------------------------------------------------
 * SERVICIO de la entidad RedSocial (frontend).
 *
 * Nota: el catalogo de redes sociales se consulta mucho (cada vez que
 * se abre el formulario de perfil social, para llenar el <select>).
 * Por eso agregamos una CACHE sencilla en memoria.
 */

import { clienteApi } from './clienteApi.js';

class RedSocialServicio {
  #ruta = '/redes-sociales';

  // Cache del catalogo completo. Arranca en null = "no cargado".
  #cacheCatalogo = null;

  async listar(filtros = {}) {
    const respuesta = await clienteApi.obtener(this.#ruta, filtros);

    return {
      redesSociales: respuesta.datos ?? [],
      meta: respuesta.meta ?? null
    };
  }

  async obtener(id) {
    const respuesta = await clienteApi.obtener(`${this.#ruta}/${id}`);
    return respuesta.datos;
  }

  async crear(datos) {
    const respuesta = await clienteApi.crear(this.#ruta, datos);

    // Al crear una red nueva, la cache queda obsoleta: la invalidamos.
    this.#invalidarCache();

    return respuesta.datos;
  }

  async actualizar(id, datos) {
    const respuesta = await clienteApi.actualizar(`${this.#ruta}/${id}`, datos);
    this.#invalidarCache();
    return respuesta.datos;
  }

  async eliminar(id) {
    const respuesta = await clienteApi.eliminar(`${this.#ruta}/${id}`);
    this.#invalidarCache();
    return respuesta.datos;
  }

  /**
   * Devuelve el catalogo completo de redes sociales, con cache.
   *
   * CUIDADO CON LAS CACHES: son utiles pero peligrosas. La regla es
   * que TODA operacion de escritura (crear, actualizar, eliminar)
   * tiene que invalidarla. Si se olvida, el usuario crea una red
   * nueva y no le aparece en el desplegable: un bug muy confuso de
   * diagnosticar.
   *
   * @param {boolean} forzarRecarga  true para ignorar la cache.
   * @returns {Promise<object[]>}
   */
  async obtenerCatalogo(forzarRecarga = false) {
    if (this.#cacheCatalogo !== null && !forzarRecarga) {
      return this.#cacheCatalogo;
    }

    // Pedimos el limite maximo que acepta la API (LIMITE_MAXIMO = 200).
    const { redesSociales } = await this.listar({ limite: 200 });

    this.#cacheCatalogo = redesSociales;

    return this.#cacheCatalogo;
  }

  /** Borra la cache. Privado: solo lo usa esta clase. */
  #invalidarCache() {
    this.#cacheCatalogo = null;
  }

  async contar() {
    const respuesta = await clienteApi.obtener(this.#ruta, { limite: 1 });
    return respuesta.meta?.total ?? 0;
  }
}

export const redSocialServicio = new RedSocialServicio();
