/**
 * middleware/logger.js
 * ---------------------------------------------------------------------
 * Middleware que registra en consola cada peticion que llega.
 *
 * QUE ES UN MIDDLEWARE?
 * Es una funcion con la firma (req, res, next) que Express ejecuta en
 * cadena, en el orden en que se registra con app.use().
 *
 *   peticion -> [logger] -> [cors] -> [json] -> [rutas] -> [errores] -> respuesta
 *
 *   req  = la peticion entrante  (lo que envia el cliente)
 *   res  = la respuesta saliente (lo que devolvemos)
 *   next = funcion para pasar el control al SIGUIENTE middleware
 *
 * Si un middleware no llama a next() ni responde, la peticion se queda
 * colgada para siempre. Es el error mas comun al empezar con Express.
 */

const { ahoraISO } = require('../utils/fechas');
const config = require('../config/env');

// Codigos de color ANSI para la terminal. Hacen el log mas legible.
// \x1b[ es el caracter de escape; 0m devuelve el color a la normalidad.
const COLOR = {
  reinicio: '\x1b[0m',
  gris: '\x1b[90m',
  verde: '\x1b[32m',
  amarillo: '\x1b[33m',
  rojo: '\x1b[31m',
  azul: '\x1b[34m',
  cian: '\x1b[36m'
};

/**
 * Elige el color segun el codigo HTTP de la respuesta.
 * 2xx verde, 3xx cian, 4xx amarillo, 5xx rojo.
 */
function colorPorEstado(estado) {
  if (estado >= 500) return COLOR.rojo;
  if (estado >= 400) return COLOR.amarillo;
  if (estado >= 300) return COLOR.cian;
  return COLOR.verde;
}

/**
 * Middleware de registro de peticiones.
 *
 * Truco clave: medimos el tiempo de respuesta escuchando el evento
 * 'finish' del objeto res. Ese evento se dispara cuando Express ya
 * envio la respuesta completa, que es el unico momento en que
 * conocemos el codigo de estado final.
 */
function registrarPeticion(req, res, next) {
  // process.hrtime.bigint() da nanosegundos con alta precision.
  // Date.now() solo da milisegundos y no sirve para medir rutas rapidas.
  const inicio = process.hrtime.bigint();

  res.on('finish', () => {
    const fin = process.hrtime.bigint();

    // De nanosegundos a milisegundos: dividimos entre un millon.
    const duracionMs = Number(fin - inicio) / 1_000_000;

    const color = colorPorEstado(res.statusCode);

    // req.originalUrl incluye la query string (?pagina=2).
    // req.method es GET, POST, PUT, DELETE...
    console.log(
      `${COLOR.gris}[${ahoraISO()}]${COLOR.reinicio} ` +
      `${COLOR.azul}${req.method}${COLOR.reinicio} ` +
      `${req.originalUrl} ` +
      `${color}${res.statusCode}${COLOR.reinicio} ` +
      `${COLOR.gris}${duracionMs.toFixed(1)} ms${COLOR.reinicio}`
    );
  });

  // En desarrollo mostramos tambien el cuerpo de la peticion.
  // En produccion NO, porque podria contener datos sensibles.
  if (config.esDesarrollo && req.body && Object.keys(req.body).length > 0) {
    console.log(`${COLOR.gris}   cuerpo:${COLOR.reinicio}`, JSON.stringify(req.body));
  }

  // Pasamos el control al siguiente middleware de la cadena.
  next();
}

module.exports = { registrarPeticion, COLOR };
