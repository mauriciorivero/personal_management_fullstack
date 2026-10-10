/**
 * middleware/errorHandler.js
 * ---------------------------------------------------------------------
 * Manejo CENTRALIZADO de errores.
 *
 * La idea: en los services y controllers simplemente lanzamos el error
 * (`throw`). Nadie responde errores a mano. Todos los errores terminan
 * aqui, en un solo lugar, que decide:
 *   - que codigo HTTP responder,
 *   - que mensaje mostrarle al usuario,
 *   - que registrar en el log del servidor.
 *
 * Ventaja: si manana hay que enviar los errores a un sistema de
 * monitoreo, se agrega UNA linea aqui y cubre toda la aplicacion.
 *
 * REGLA DE ORO DE EXPRESS: el middleware de errores tiene CUATRO
 * parametros (err, req, res, next). Si le pones tres, Express lo
 * registra como middleware normal y nunca atrapara los errores.
 */

const AppError = require('../utils/AppError');
const MENSAJES = require('../utils/mensajes');
const { HTTP, CODIGO_ERROR } = require('../utils/constants');
const respuesta = require('../utils/respuesta');
const config = require('../config/env');
const { COLOR } = require('./logger');

/**
 * Traduce los codigos de error de MySQL a errores de la aplicacion.
 *
 * MySQL devuelve codigos tecnicos como 'ER_DUP_ENTRY' que no se le
 * pueden mostrar a un usuario final. Aqui los convertimos en mensajes
 * entendibles y en el codigo HTTP adecuado.
 *
 * @param {Error} error  Error original del driver mysql2.
 * @returns {AppError|null}  AppError traducido, o null si no era de MySQL.
 */
function traducirErrorMySQL(error) {
  // El driver mysql2 agrega la propiedad `code` a sus errores.
  const codigo = error.code;

  switch (codigo) {
    // Se intento insertar un valor repetido en una llave UNIQUE o PRIMARY.
    case 'ER_DUP_ENTRY':
      return AppError.conflicto(
        'El registro ya existe. Revisa los campos que deben ser unicos.'
      );

    // Se referencio un id que no existe en la tabla padre.
    // Ejemplo: crear un TELEFONO con USUARIO_id = 9999.
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return new AppError(
        'El registro referenciado no existe. Verifica los identificadores enviados.',
        HTTP.SOLICITUD_INCORRECTA,
        CODIGO_ERROR.LLAVE_FORANEA
      );

    // Se intento borrar un registro padre que aun tiene hijos.
    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
      return new AppError(
        'No se puede eliminar el registro porque otros registros dependen de el.',
        HTTP.CONFLICTO,
        CODIGO_ERROR.LLAVE_FORANEA
      );

    // El texto enviado es mas largo que el VARCHAR de la columna.
    case 'ER_DATA_TOO_LONG':
      return AppError.validacion(
        'Uno de los campos supera el tamanio permitido por la base de datos (45 caracteres).'
      );

    // Se envio null en una columna NOT NULL.
    case 'ER_BAD_NULL_ERROR':
      return AppError.validacion('Falta un campo obligatorio requerido por la base de datos.');

    // El servidor MySQL esta apagado o no acepta conexiones.
    case 'ECONNREFUSED':
    case 'PROTOCOL_CONNECTION_LOST':
    case 'ER_CON_COUNT_ERROR':
      return AppError.baseDatos(
        'No se pudo conectar con la base de datos. Verifica que MySQL este encendido.'
      );

    // Usuario o clave incorrectos en el archivo .env
    case 'ER_ACCESS_DENIED_ERROR':
      return AppError.baseDatos(
        'Credenciales de base de datos incorrectas. Revisa DB_USUARIO y DB_CLAVE en tu archivo .env'
      );

    default:
      // No era un error de MySQL que sepamos traducir.
      return null;
  }
}

/**
 * Middleware 404: se registra DESPUES de todas las rutas.
 * Si la peticion llego hasta aqui, ninguna ruta coincidio.
 */
function rutaNoEncontrada(req, res, next) {
  const error = new AppError(
    MENSAJES.SISTEMA.RUTA_NO_ENCONTRADA(req.method, req.originalUrl),
    HTTP.NO_ENCONTRADO,
    CODIGO_ERROR.RUTA_NO_ENCONTRADA
  );

  // next(error) salta directo al middleware de errores.
  // Si llamaramos next() sin argumento, seguiria la cadena normal.
  next(error);
}

/**
 * Middleware de errores. DEBE ser el ultimo app.use() de la aplicacion
 * y DEBE declarar cuatro parametros.
 */
// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, next) {
  // ----- Paso 1: normalizar el error a un AppError -----
  let error = err;

  if (!(error instanceof AppError)) {
    // Caso A: JSON mal formado. express.json() lanza un SyntaxError
    // con la propiedad `body` cuando el cuerpo no se pudo parsear.
    if (error instanceof SyntaxError && 'body' in error) {
      error = AppError.validacion(MENSAJES.SISTEMA.JSON_MAL_FORMADO);
    } else {
      // Caso B: error del driver de MySQL.
      const traducido = traducirErrorMySQL(error);

      if (traducido !== null) {
        error = traducido;
      } else {
        // Caso C: cualquier otro error inesperado (un bug nuestro).
        // No mostramos el mensaje interno al cliente para no filtrar
        // detalles de implementacion; eso solo viaja al log.
        error = new AppError(
          MENSAJES.SISTEMA.ERROR_INTERNO,
          HTTP.ERROR_SERVIDOR,
          CODIGO_ERROR.INTERNO
        );
      }
    }
  }

  // ----- Paso 2: registrar en el log del servidor -----
  const esErrorServidor = error.estadoHttp >= HTTP.ERROR_SERVIDOR;

  if (esErrorServidor) {
    // Los errores 5xx son bugs: registramos TODO, incluido el stack.
    console.error(
      `${COLOR.rojo}[ERROR ${error.estadoHttp}]${COLOR.reinicio} ` +
      `${req.method} ${req.originalUrl}\n`,
      err.stack || err
    );
  } else if (config.esDesarrollo) {
    // Los 4xx son errores del cliente: una linea basta.
    console.warn(
      `${COLOR.amarillo}[AVISO ${error.estadoHttp}]${COLOR.reinicio} ` +
      `${req.method} ${req.originalUrl} -> ${error.message}`
    );
  }

  // ----- Paso 3: responder al cliente -----
  return respuesta.error(res, {
    estado: error.estadoHttp,
    codigo: error.codigo,
    mensaje: error.message,
    detalles: error.detalles
  });
}

/**
 * Envoltorio para controladores asincronos.
 *
 * PROBLEMA: Express 4 no atrapa los errores de funciones `async`.
 * Si un controlador async lanza un error, la peticion se queda colgada
 * y el cliente espera para siempre.
 *
 * SOLUCION CLASICA (repetitiva):
 *   async function listar(req, res, next) {
 *     try { ... } catch (e) { next(e); }
 *   }
 *
 * SOLUCION ELEGANTE: envolvemos el controlador en esta funcion, que
 * engancha un .catch(next) automatico. Asi los controladores quedan
 * limpios, sin try/catch repetido en cada metodo.
 *
 * @param {function} funcionAsincrona
 * @returns {function} Middleware listo para Express.
 */
function capturarAsync(funcionAsincrona) {
  return function (req, res, next) {
    // Promise.resolve() convierte el retorno en promesa aunque la
    // funcion no fuera async, y .catch(next) envia cualquier error
    // al middleware manejadorErrores.
    Promise.resolve(funcionAsincrona(req, res, next)).catch(next);
  };
}

module.exports = {
  rutaNoEncontrada,
  manejadorErrores,
  capturarAsync,
  traducirErrorMySQL
};
