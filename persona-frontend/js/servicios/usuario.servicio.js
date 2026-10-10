/**
 * js/servicios/usuario.servicio.js
 * ---------------------------------------------------------------------
 * SERVICIO de la entidad Usuario (frontend).
 *
 * SU RESPONSABILIDAD: saber QUE rutas de la API corresponden a los
 * usuarios y devolver los datos ya listos para pintar.
 *
 * Observa la simetria con el backend. El proyecto tiene la MISMA
 * arquitectura en capas en los dos lados:
 *
 *   BACKEND                        FRONTEND
 *   ------------------------       ------------------------
 *   routes/      (URL)             paginas/     (vista)
 *   controllers/ (HTTP)            organismos/  (componentes)
 *   services/    (negocio)         servicios/   (acceso a la API)
 *   models/      (entidades)       utiles/      (formato, validacion)
 *   config/database.js (MySQL)     servicios/clienteApi.js (HTTP)
 *
 * Las paginas NUNCA llaman a fetch directamente: le piden los datos a
 * este servicio. Asi, si manana la ruta cambia de /usuarios a
 * /personas, se corrige UN archivo.
 */

import { clienteApi } from './clienteApi.js';

class UsuarioServicio {
  // Ruta base del recurso. Si la API cambia, se cambia aqui.
  #ruta = '/usuarios';

  /**
   * Lista usuarios con filtros y paginacion.
   *
   * @param {object} filtros  { pagina, limite, estado, ciudad, buscar }
   * @returns {Promise<{usuarios: object[], meta: object}>}
   */
  async listar(filtros = {}) {
    const respuesta = await clienteApi.obtener(this.#ruta, filtros);

    return {
      // El operador ?? protege el caso de que la API devuelva null.
      usuarios: respuesta.datos ?? [],
      meta: respuesta.meta ?? null
    };
  }

  /**
   * Obtiene un usuario con sus telefonos y perfiles sociales.
   * @param {number} id
   * @returns {Promise<object>}
   */
  async obtener(id) {
    const respuesta = await clienteApi.obtener(`${this.#ruta}/${id}`);
    return respuesta.datos;
  }

  /**
   * Crea un usuario.
   *
   * Fijate en lo que NO enviamos: la propiedad `edad`. La calcula el
   * servidor a partir de fechaNacimiento. Mandarla seria inutil
   * porque la API la ignora (no esta en su lista blanca de campos).
   *
   * @param {object} datos
   * @returns {Promise<object>}
   */
  async crear(datos) {
    const respuesta = await clienteApi.crear(this.#ruta, datos);
    return respuesta.datos;
  }

  /** Actualiza un usuario (admite actualizacion parcial). */
  async actualizar(id, datos) {
    const respuesta = await clienteApi.actualizar(`${this.#ruta}/${id}`, datos);
    return respuesta.datos;
  }

  /**
   * Elimina un usuario y, en cascada, sus telefonos y perfiles.
   * Devuelve el resumen de cuantas filas relacionadas se borraron.
   */
  async eliminar(id) {
    const respuesta = await clienteApi.eliminar(`${this.#ruta}/${id}`);
    return respuesta.datos;
  }

  /** Telefonos de un usuario (subrecurso de la API). */
  async listarTelefonos(id) {
    const respuesta = await clienteApi.obtener(`${this.#ruta}/${id}/telefonos`);
    return respuesta.datos ?? [];
  }

  /** Perfiles sociales de un usuario (subrecurso de la API). */
  async listarPerfilesSociales(id) {
    const respuesta = await clienteApi.obtener(`${this.#ruta}/${id}/perfiles-sociales`);
    return respuesta.datos ?? [];
  }

  /**
   * Cuenta el total de usuarios, para la tarjeta de resumen.
   *
   * Truco de eficiencia: pedimos limite=1 porque NO necesitamos los
   * datos, solo el campo meta.total. Asi la API devuelve un registro
   * en lugar de cincuenta.
   */
  async contar() {
    const respuesta = await clienteApi.obtener(this.#ruta, { limite: 1 });
    return respuesta.meta?.total ?? 0;
  }
}

export const usuarioServicio = new UsuarioServicio();
