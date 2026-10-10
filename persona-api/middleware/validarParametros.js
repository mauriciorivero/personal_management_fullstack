/**
 * middleware/validarParametros.js
 * ---------------------------------------------------------------------
 * Middlewares que validan los parametros de la URL ANTES de que la
 * peticion llegue al controlador.
 *
 * Por que validar aqui y no en el controlador?
 * Porque es una validacion de FORMATO, no de negocio. Si alguien pide
 * GET /api/usuarios/abc, no tiene sentido abrir una conexion a MySQL:
 * rechazamos de inmediato con 400 y ahorramos trabajo al servidor.
 *
 * Esto se llama "fail fast": fallar lo antes posible, lo mas cerca
 * posible de donde entra el dato malo.
 */

const AppError = require('../utils/AppError');
const MENSAJES = require('../utils/mensajes');
const { esEnteroPositivo } = require('../utils/validadores');

/**
 * FABRICA DE MIDDLEWARES.
 *
 * Fijate que esta funcion NO es el middleware: es una funcion que
 * DEVUELVE un middleware. Ese patron se llama "closure" y permite
 * configurar el middleware al registrarlo:
 *
 *   router.get('/:id', validarIdNumerico('id'), controlador.obtener);
 *   router.delete('/:redSocialId/:usuarioId',
 *     validarIdNumerico('redSocialId'),
 *     validarIdNumerico('usuarioId'),
 *     controlador.eliminar);
 *
 * @param {string} nombreParametro  Nombre del parametro en la ruta.
 * @returns {function} Middleware de Express.
 */
function validarIdNumerico(nombreParametro = 'id') {
  return function (req, res, next) {
    // req.params contiene los parametros de la ruta (:id -> req.params.id)
    const valor = req.params[nombreParametro];

    if (!esEnteroPositivo(valor)) {
      // Pasamos el error al middleware manejadorErrores.
      return next(
        AppError.validacion(MENSAJES.VALIDACION.ID_INVALIDO(nombreParametro), [
          { campo: nombreParametro, mensaje: MENSAJES.VALIDACION.ID_INVALIDO(nombreParametro) }
        ])
      );
    }

    // Convertimos el texto "7" a numero 7 y lo dejamos disponible en
    // req.idsValidados para que el controlador no repita la conversion.
    if (!req.idsValidados) {
      req.idsValidados = {};
    }
    req.idsValidados[nombreParametro] = Number.parseInt(valor, 10);

    next();
  };
}

/**
 * Rechaza las peticiones con el cuerpo vacio.
 * Se usa en POST y PUT, donde enviar {} casi siempre es un error
 * del cliente (por ejemplo, olvido la cabecera Content-Type).
 */
function exigirCuerpo(req, res, next) {
  const cuerpo = req.body;

  const estaVacio =
    cuerpo === null ||
    cuerpo === undefined ||
    typeof cuerpo !== 'object' ||
    Object.keys(cuerpo).length === 0;

  if (estaVacio) {
    return next(AppError.validacion(MENSAJES.VALIDACION.CUERPO_VACIO));
  }

  next();
}

module.exports = { validarIdNumerico, exigirCuerpo };
