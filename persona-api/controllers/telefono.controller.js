/**
 * controllers/telefono.controller.js
 * ---------------------------------------------------------------------
 * CAPA DE CONTROLADOR de la entidad Telefono.
 *
 * Nota de disenio REST: este controlador atiende dos familias de rutas.
 *
 *   1. Recurso principal:  /api/telefonos
 *   2. Subrecurso:         /api/usuarios/:id/telefonos
 *
 * La segunda forma expresa la relacion "los telefonos DE este usuario"
 * y es la que recomienda REST para relaciones 1 a N. Las dos conviven
 * sin problema porque la logica esta en el service, no aqui.
 */

const telefonoService = require('../services/telefono.service');
const respuesta = require('../utils/respuesta');
const MENSAJES = require('../utils/mensajes');
const { capturarAsync } = require('../middleware/errorHandler');

class TelefonoController {
  /**
   * GET /api/telefonos
   * Query admitida: ?usuarioId=5&activo=1&tipo=Celular&buscar=300&pagina=1
   */
  listar = capturarAsync(async (req, res) => {
    const { telefonos, total, pagina, limite } = await telefonoService.listar(req.query);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.LISTA('telefonos'),
      datos: telefonos,
      meta: respuesta.construirMeta({
        total,
        pagina,
        limite,
        devueltos: telefonos.length
      })
    });
  });

  /** GET /api/telefonos/:id */
  obtener = capturarAsync(async (req, res) => {
    const telefono = await telefonoService.obtenerPorId(req.idsValidados.id);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.DETALLE('Telefono'),
      datos: telefono
    });
  });

  /**
   * GET /api/usuarios/:id/telefonos
   * Los telefonos de un usuario concreto (subrecurso).
   */
  listarPorUsuario = capturarAsync(async (req, res) => {
    const usuarioId = req.idsValidados.id;

    const telefonos = await telefonoService.listarPorUsuario(usuarioId);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.LISTA(`telefonos del usuario ${usuarioId}`),
      datos: telefonos
    });
  });

  /** POST /api/telefonos */
  crear = capturarAsync(async (req, res) => {
    const telefono = await telefonoService.crear(req.body);

    res.set('Location', `/api/telefonos/${telefono.id}`);

    return respuesta.creado(res, {
      mensaje: MENSAJES.EXITO.CREADO('Telefono'),
      datos: telefono
    });
  });

  /**
   * POST /api/usuarios/:id/telefonos
   * Crea un telefono para un usuario, tomando el id del usuario de la
   * URL en lugar del cuerpo.
   *
   * Fijate en el orden del spread: ponemos usuarioId DESPUES de
   * ...req.body a proposito. Asi, si el cuerpo trae otro usuarioId
   * distinto, la URL manda. La URL es la fuente de verdad del recurso.
   */
  crearParaUsuario = capturarAsync(async (req, res) => {
    const usuarioId = req.idsValidados.id;

    const telefono = await telefonoService.crear({
      ...req.body,
      usuarioId
    });

    res.set('Location', `/api/telefonos/${telefono.id}`);

    return respuesta.creado(res, {
      mensaje: MENSAJES.EXITO.CREADO('Telefono'),
      datos: telefono
    });
  });

  /** PUT /api/telefonos/:id */
  actualizar = capturarAsync(async (req, res) => {
    const telefono = await telefonoService.actualizar(req.idsValidados.id, req.body);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.ACTUALIZADO('Telefono'),
      datos: telefono
    });
  });

  /** DELETE /api/telefonos/:id */
  eliminar = capturarAsync(async (req, res) => {
    const resumen = await telefonoService.eliminar(req.idsValidados.id);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.ELIMINADO('Telefono'),
      datos: resumen
    });
  });

  /**
   * PATCH /api/telefonos/:id/activar
   * PATCH /api/telefonos/:id/desactivar
   *
   * Otro patron de fabrica: este metodo NO es el manejador, DEVUELVE
   * el manejador ya configurado. Asi evitamos escribir dos metodos
   * casi identicos.
   *
   * Y por que PATCH y no PUT? Porque PUT significa "reemplaza el
   * recurso completo" y aqui solo tocamos una bandera. PATCH es el
   * verbo correcto para una modificacion parcial puntual.
   */
  cambiarEstado(activar) {
    return capturarAsync(async (req, res) => {
      const telefono = await telefonoService.cambiarEstado(req.idsValidados.id, activar);

      return respuesta.exito(res, {
        mensaje: `Telefono ${activar ? 'activado' : 'desactivado'} correctamente.`,
        datos: telefono
      });
    });
  }
}

module.exports = new TelefonoController();
