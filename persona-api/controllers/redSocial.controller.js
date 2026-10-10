/**
 * controllers/redSocial.controller.js
 * ---------------------------------------------------------------------
 * CAPA DE CONTROLADOR de la entidad RedSocial.
 *
 * Es el controlador mas corto del proyecto: un CRUD de catalogo sin
 * subrecursos. Si entiendes este, entiendes los cuatro.
 */

const redSocialService = require('../services/redSocial.service');
const respuesta = require('../utils/respuesta');
const MENSAJES = require('../utils/mensajes');
const { capturarAsync } = require('../middleware/errorHandler');

class RedSocialController {
  /**
   * GET /api/redes-sociales
   * Query admitida: ?buscar=insta&pagina=1&limite=20
   */
  listar = capturarAsync(async (req, res) => {
    const { redesSociales, total, pagina, limite } = await redSocialService.listar(req.query);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.LISTA('redes sociales'),
      datos: redesSociales,
      meta: respuesta.construirMeta({
        total,
        pagina,
        limite,
        devueltos: redesSociales.length
      })
    });
  });

  /** GET /api/redes-sociales/:id */
  obtener = capturarAsync(async (req, res) => {
    const redSocial = await redSocialService.obtenerPorId(req.idsValidados.id);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.DETALLE('Red social'),
      datos: redSocial
    });
  });

  /** POST /api/redes-sociales */
  crear = capturarAsync(async (req, res) => {
    const redSocial = await redSocialService.crear(req.body);

    res.set('Location', `/api/redes-sociales/${redSocial.id}`);

    return respuesta.creado(res, {
      mensaje: MENSAJES.EXITO.CREADO('Red social'),
      datos: redSocial
    });
  });

  /** PUT /api/redes-sociales/:id */
  actualizar = capturarAsync(async (req, res) => {
    const redSocial = await redSocialService.actualizar(req.idsValidados.id, req.body);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.ACTUALIZADO('Red social'),
      datos: redSocial
    });
  });

  /**
   * DELETE /api/redes-sociales/:id
   * El service responde 409 si la red tiene perfiles asociados.
   */
  eliminar = capturarAsync(async (req, res) => {
    const resumen = await redSocialService.eliminar(req.idsValidados.id);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.ELIMINADO('Red social'),
      datos: resumen
    });
  });
}

module.exports = new RedSocialController();
