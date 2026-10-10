/**
 * utils/respuesta.js
 * ---------------------------------------------------------------------
 * Constructor del "sobre" (envelope) de respuesta de la API.
 *
 * Por que un formato unico de respuesta?
 * Porque el frontend necesita un contrato ESTABLE. Si cada endpoint
 * responde distinto, el codigo del cliente se llena de condicionales.
 *
 * Contrato de esta API:
 *
 *   Exito:
 *   {
 *     "ok": true,
 *     "mensaje": "Usuario creado correctamente.",
 *     "datos": { ... }  o  [ ... ],
 *     "meta": { "total": 5, "pagina": 1, "limite": 50 }   <- opcional
 *   }
 *
 *   Error:
 *   {
 *     "ok": false,
 *     "error": {
 *       "codigo": "VALIDACION",
 *       "mensaje": "Los datos enviados no son validos.",
 *       "detalles": [ { "campo": "edad", "mensaje": "..." } ]
 *     }
 *   }
 *
 * La bandera "ok" permite al frontend hacer `if (respuesta.ok)` sin
 * tener que interpretar el codigo HTTP.
 */

const { HTTP } = require('./constants');

/**
 * Envia una respuesta exitosa.
 *
 * @param {import('express').Response} res  Objeto response de Express.
 * @param {object} opciones
 * @param {number} opciones.estado    Codigo HTTP (defecto 200).
 * @param {string} opciones.mensaje   Texto para el usuario.
 * @param {*}      opciones.datos     Carga util (objeto o arreglo).
 * @param {object} opciones.meta      Metadatos opcionales (paginacion).
 */
function exito(res, { estado = HTTP.OK, mensaje = '', datos = null, meta = null } = {}) {
  const cuerpo = { ok: true, mensaje };

  // Incluimos "datos" aunque sea null, para que el frontend siempre
  // encuentre la propiedad y no tenga que preguntar si existe.
  cuerpo.datos = datos;

  // "meta" solo aparece cuando tiene sentido (listados paginados).
  if (meta !== null) {
    cuerpo.meta = meta;
  }

  return res.status(estado).json(cuerpo);
}

/**
 * Atajo para respuestas 201 Created (resultado de un POST).
 */
function creado(res, { mensaje = '', datos = null } = {}) {
  return exito(res, { estado: HTTP.CREADO, mensaje, datos });
}

/**
 * Envia una respuesta de error ya formateada.
 * Normalmente NO se llama directo: el middleware de errores la usa.
 *
 * @param {import('express').Response} res
 * @param {object} opciones
 */
function error(res, { estado = HTTP.ERROR_SERVIDOR, codigo = 'INTERNO', mensaje = '', detalles = [] } = {}) {
  const cuerpo = {
    ok: false,
    error: { codigo, mensaje }
  };

  if (Array.isArray(detalles) && detalles.length > 0) {
    cuerpo.error.detalles = detalles;
  }

  return res.status(estado).json(cuerpo);
}

/**
 * Construye el objeto "meta" de un listado paginado.
 *
 * @param {object} opciones
 * @param {number} opciones.total    Total de registros en la tabla.
 * @param {number} opciones.pagina   Pagina solicitada.
 * @param {number} opciones.limite   Registros por pagina.
 * @param {number} opciones.devueltos Registros en esta respuesta.
 */
function construirMeta({ total, pagina, limite, devueltos }) {
  // Math.ceil redondea hacia arriba: 11 registros de 5 en 5 -> 3 paginas.
  const totalPaginas = limite > 0 ? Math.ceil(total / limite) : 0;

  return {
    total,
    pagina,
    limite,
    devueltos,
    totalPaginas,
    hayPaginaSiguiente: pagina < totalPaginas,
    hayPaginaAnterior: pagina > 1
  };
}

module.exports = { exito, creado, error, construirMeta };
