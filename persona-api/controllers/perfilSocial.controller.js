/**
 * controllers/perfilSocial.controller.js
 * ---------------------------------------------------------------------
 * CAPA DE CONTROLADOR de la entidad PerfilSocial.
 *
 * LA DIFERENCIA CLAVE: la llave primaria es COMPUESTA, asi que la URL
 * del recurso lleva DOS parametros.
 *
 *   GET    /api/perfiles-sociales/:redSocialId/:usuarioId
 *   PUT    /api/perfiles-sociales/:redSocialId/:usuarioId
 *   DELETE /api/perfiles-sociales/:redSocialId/:usuarioId
 *
 * Los dos parametros los valida el middleware validarIdNumerico, que
 * se registra DOS veces en la ruta (una por parametro), y deja los dos
 * valores ya convertidos en req.idsValidados.
 *
 * El orden de los segmentos (red primero, usuario despues) imita el
 * orden de la llave primaria del modelo:
 *     PRIMARY KEY (RED_SOCIAL_id, USUARIO_id)
 * Mantener la coherencia entre la base de datos y la URL hace la API
 * mucho mas facil de recordar.
 */

const perfilSocialService = require('../services/perfilSocial.service');
const respuesta = require('../utils/respuesta');
const MENSAJES = require('../utils/mensajes');
const { capturarAsync } = require('../middleware/errorHandler');

class PerfilSocialController {
  /**
   * GET /api/perfiles-sociales
   * Query admitida: ?usuarioId=5&redSocialId=7&pagina=1&limite=20
   */
  listar = capturarAsync(async (req, res) => {
    const { perfilesSociales, total, pagina, limite } =
      await perfilSocialService.listar(req.query);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.LISTA('perfiles sociales'),
      datos: perfilesSociales,
      meta: respuesta.construirMeta({
        total,
        pagina,
        limite,
        devueltos: perfilesSociales.length
      })
    });
  });

  /** GET /api/perfiles-sociales/:redSocialId/:usuarioId */
  obtener = capturarAsync(async (req, res) => {
    // Los dos id vienen del middleware, ya convertidos a numero.
    const { redSocialId, usuarioId } = req.idsValidados;

    const perfil = await perfilSocialService.obtenerPorLlave(redSocialId, usuarioId);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.DETALLE('Perfil social'),
      datos: perfil
    });
  });

  /**
   * GET /api/usuarios/:id/perfiles-sociales
   * Los perfiles sociales de un usuario (subrecurso).
   */
  listarPorUsuario = capturarAsync(async (req, res) => {
    const usuarioId = req.idsValidados.id;

    const perfiles = await perfilSocialService.listarPorUsuario(usuarioId);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.LISTA(`perfiles sociales del usuario ${usuarioId}`),
      datos: perfiles
    });
  });

  /** POST /api/perfiles-sociales */
  crear = capturarAsync(async (req, res) => {
    const perfil = await perfilSocialService.crear(req.body);

    // La URL del recurso creado se arma con las DOS mitades de la llave.
    res.set(
      'Location',
      `/api/perfiles-sociales/${perfil.redSocialId}/${perfil.usuarioId}`
    );

    return respuesta.creado(res, {
      mensaje: MENSAJES.EXITO.CREADO('Perfil social'),
      datos: perfil
    });
  });

  /**
   * POST /api/usuarios/:id/perfiles-sociales
   * Crea un perfil para un usuario tomando su id de la URL.
   */
  crearParaUsuario = capturarAsync(async (req, res) => {
    const usuarioId = req.idsValidados.id;

    const perfil = await perfilSocialService.crear({
      ...req.body,
      usuarioId
    });

    res.set(
      'Location',
      `/api/perfiles-sociales/${perfil.redSocialId}/${perfil.usuarioId}`
    );

    return respuesta.creado(res, {
      mensaje: MENSAJES.EXITO.CREADO('Perfil social'),
      datos: perfil
    });
  });

  /**
   * PUT /api/perfiles-sociales/:redSocialId/:usuarioId
   * Solo se puede cambiar urlPerfil (la llave compuesta es inmutable).
   */
  actualizar = capturarAsync(async (req, res) => {
    const { redSocialId, usuarioId } = req.idsValidados;

    const perfil = await perfilSocialService.actualizar(redSocialId, usuarioId, req.body);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.ACTUALIZADO('Perfil social'),
      datos: perfil
    });
  });

  /** DELETE /api/perfiles-sociales/:redSocialId/:usuarioId */
  eliminar = capturarAsync(async (req, res) => {
    const { redSocialId, usuarioId } = req.idsValidados;

    const resumen = await perfilSocialService.eliminar(redSocialId, usuarioId);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.ELIMINADO('Perfil social'),
      datos: resumen
    });
  });
}

module.exports = new PerfilSocialController();
