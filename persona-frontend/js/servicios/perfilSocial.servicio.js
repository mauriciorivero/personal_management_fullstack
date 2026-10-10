/**
 * js/servicios/perfilSocial.servicio.js
 * ---------------------------------------------------------------------
 * SERVICIO de la entidad PerfilSocial (frontend).
 *
 * LA PARTICULARIDAD: la LLAVE COMPUESTA.
 *
 * Esta entidad no tiene un `id` propio. Su identidad son dos valores
 * juntos, asi que todos los metodos que apuntan a un perfil concreto
 * reciben DOS parametros y construyen una URL de dos segmentos:
 *
 *   obtener(redSocialId, usuarioId)
 *     -> GET /api/perfiles-sociales/4/3
 *
 * El orden importa y no es arbitrario: imita el de la PRIMARY KEY de
 * la tabla, PRIMARY KEY (RED_SOCIAL_id, USUARIO_id). Mantener ese
 * mismo orden en la base de datos, en la API y en el frontend hace
 * que el sistema completo sea predecible.
 */

import { clienteApi } from './clienteApi.js';

class PerfilSocialServicio {
  #ruta = '/perfiles-sociales';

  /**
   * Construye la ruta de un perfil a partir de su llave compuesta.
   * Metodo privado para no repetir la concatenacion en cada metodo.
   */
  #rutaLlave(redSocialId, usuarioId) {
    return `${this.#ruta}/${redSocialId}/${usuarioId}`;
  }

  /**
   * Lista perfiles sociales.
   * @param {object} filtros  { usuarioId, redSocialId, pagina, limite }
   */
  async listar(filtros = {}) {
    const respuesta = await clienteApi.obtener(this.#ruta, filtros);

    return {
      perfilesSociales: respuesta.datos ?? [],
      meta: respuesta.meta ?? null
    };
  }

  /** Obtiene un perfil por su llave compuesta. */
  async obtener(redSocialId, usuarioId) {
    const respuesta = await clienteApi.obtener(this.#rutaLlave(redSocialId, usuarioId));
    return respuesta.datos;
  }

  /** Crea un perfil. `datos` debe traer redSocialId y usuarioId. */
  async crear(datos) {
    const respuesta = await clienteApi.crear(this.#ruta, datos);
    return respuesta.datos;
  }

  /** Crea un perfil por la ruta de subrecurso del usuario. */
  async crearParaUsuario(usuarioId, datos) {
    const respuesta = await clienteApi.crear(
      `/usuarios/${usuarioId}/perfiles-sociales`,
      datos
    );
    return respuesta.datos;
  }

  /**
   * Actualiza un perfil.
   *
   * Solo se puede cambiar `urlPerfil`. La llave compuesta identifica
   * el recurso y es INMUTABLE: si se intenta enviar otro redSocialId,
   * la API responde 400 explicando por que.
   */
  async actualizar(redSocialId, usuarioId, datos) {
    const respuesta = await clienteApi.actualizar(
      this.#rutaLlave(redSocialId, usuarioId),
      datos
    );
    return respuesta.datos;
  }

  /** Elimina un perfil por su llave compuesta. */
  async eliminar(redSocialId, usuarioId) {
    const respuesta = await clienteApi.eliminar(this.#rutaLlave(redSocialId, usuarioId));
    return respuesta.datos;
  }

  async contar() {
    const respuesta = await clienteApi.obtener(this.#ruta, { limite: 1 });
    return respuesta.meta?.total ?? 0;
  }
}

export const perfilSocialServicio = new PerfilSocialServicio();
