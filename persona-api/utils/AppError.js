/**
 * utils/AppError.js
 * ---------------------------------------------------------------------
 * Clase de error propia de la aplicacion.
 *
 * Problema: el Error nativo de JavaScript solo tiene "message".
 * No sabe de codigos HTTP ni de listas de campos invalidos.
 *
 * Solucion: HEREDAMOS de Error (extends) y le agregamos lo que
 * necesitamos. Asi, cuando el middleware de errores recibe el objeto,
 * puede decidir si responde 400, 404 o 500 preguntandole al error mismo.
 *
 * Esto es POLIMORFISMO por herencia: AppError "es un" Error, entonces
 * funciona con try/catch, con throw y con instanceof como cualquier otro.
 */

const { HTTP, CODIGO_ERROR } = require('./constants');

class AppError extends Error {
  // Atributos privados: solo se leen a traves de los getters.
  #estadoHttp;
  #codigo;
  #detalles;
  #esOperacional;

  /**
   * @param {string} mensaje       Texto legible para el usuario final.
   * @param {number} estadoHttp    Codigo HTTP con el que se respondera.
   * @param {string} codigo        Codigo interno (ver CODIGO_ERROR).
   * @param {Array}  detalles      Lista opcional de errores de campo.
   */
  constructor(
    mensaje,
    estadoHttp = HTTP.ERROR_SERVIDOR,
    codigo = CODIGO_ERROR.INTERNO,
    detalles = []
  ) {
    // super() llama al constructor de Error y asigna this.message.
    super(mensaje);

    // El nombre de la clase, util en los logs.
    this.name = 'AppError';

    this.#estadoHttp = estadoHttp;
    this.#codigo = codigo;
    this.#detalles = detalles;

    // true  -> error previsto (validacion, no encontrado). Se le muestra al usuario.
    // false -> error inesperado (bug). Se registra completo en el log.
    this.#esOperacional = true;

    // Limpia el stack trace para que apunte a donde se lanzo el error
    // y no al constructor de esta clase.
    Error.captureStackTrace(this, this.constructor);
  }

  // ---------------- Getters ----------------
  get estadoHttp() {
    return this.#estadoHttp;
  }

  get codigo() {
    return this.#codigo;
  }

  get detalles() {
    // Devolvemos una COPIA del arreglo. Si devolvieramos la referencia,
    // quien la reciba podria modificar el estado interno del error.
    return [...this.#detalles];
  }

  get esOperacional() {
    return this.#esOperacional;
  }

  // ---------------- Metodos de fabrica (static) ----------------
  // Son atajos para crear los errores mas comunes sin repetir argumentos.
  // Se llaman sobre la CLASE, no sobre una instancia:
  //    throw AppError.noEncontrado('No existe el usuario 9');

  static validacion(mensaje, detalles = []) {
    return new AppError(
      mensaje,
      HTTP.SOLICITUD_INCORRECTA,
      CODIGO_ERROR.VALIDACION,
      detalles
    );
  }

  static noEncontrado(mensaje) {
    return new AppError(mensaje, HTTP.NO_ENCONTRADO, CODIGO_ERROR.NO_ENCONTRADO);
  }

  static conflicto(mensaje) {
    return new AppError(mensaje, HTTP.CONFLICTO, CODIGO_ERROR.DUPLICADO);
  }

  static baseDatos(mensaje) {
    return new AppError(mensaje, HTTP.ERROR_SERVIDOR, CODIGO_ERROR.BASE_DATOS);
  }

  /**
   * Convierte el error al formato JSON que viaja al cliente.
   * Nunca incluye el stack trace: eso se queda en el servidor.
   */
  aJSON() {
    const cuerpo = {
      ok: false,
      error: {
        codigo: this.#codigo,
        mensaje: this.message
      }
    };

    // Solo agregamos "detalles" si hay algo que mostrar.
    if (this.#detalles.length > 0) {
      cuerpo.error.detalles = this.detalles;
    }

    return cuerpo;
  }
}

module.exports = AppError;
