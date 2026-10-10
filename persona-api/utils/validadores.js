/**
 * utils/validadores.js
 * ---------------------------------------------------------------------
 * Validadores personalizados + la clase ColectorErrores.
 *
 * Filosofia de validacion de esta API:
 *   NO cortamos en el primer error. Revisamos TODOS los campos y
 *   devolvemos la lista completa de problemas en una sola respuesta.
 *   Asi el usuario corrige el formulario una vez y no de a un campo.
 *
 * Para lograrlo usamos la clase ColectorErrores, que va acumulando
 * los errores encontrados (patron "Notification" de Martin Fowler).
 */

const MENSAJES = require('./mensajes');
const { LIMITES } = require('./constants');

// ---------------------------------------------------------------------
// Expresiones regulares reutilizables
// ---------------------------------------------------------------------

// Letras del espanol (incluye tildes y enie), espacios, apostrofe y guion.
// À-ɏ cubre los caracteres latinos acentuados en Unicode.
const PATRON_NOMBRE = /^[A-Za-zÀ-ɏḀ-ỿ\s'.-]+$/;

// Digitos, signo +, guiones y espacios. Entre 7 y 20 caracteres.
const PATRON_TELEFONO = /^[+]?[\d\s-]{7,20}$/;

// URL que empieza obligatoriamente con http:// o https://
const PATRON_URL = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

// ---------------------------------------------------------------------
// Validadores atomicos: cada funcion responde true o false
// ---------------------------------------------------------------------

/** El valor es un texto con al menos un caracter visible. */
function esTextoNoVacio(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

/** El texto NO supera el maximo de caracteres. */
function cumpleLongitud(valor, maximo = LIMITES.VARCHAR_CORTO) {
  return typeof valor === 'string' && valor.length <= maximo;
}

/** El texto solo contiene letras, espacios, apostrofes, puntos y guiones. */
function esSoloLetras(valor) {
  return typeof valor === 'string' && PATRON_NOMBRE.test(valor);
}

/** El valor es un numero entero (positivo, negativo o cero). */
function esEntero(valor) {
  return Number.isInteger(Number(valor)) && String(valor).trim() !== '';
}

/** El valor es un numero entero mayor que cero. Se usa para los id. */
function esEnteroPositivo(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0;
}

/** El numero esta dentro del rango inclusivo [minimo, maximo]. */
function estaEnRango(valor, minimo, maximo) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= minimo && numero <= maximo;
}

/** El valor pertenece a una lista cerrada de opciones. */
function estaEnLista(valor, listaPermitida) {
  return listaPermitida.includes(valor);
}

/** El texto tiene forma de URL http(s). */
function esURLValida(valor) {
  return typeof valor === 'string' && PATRON_URL.test(valor);
}

/** El texto tiene forma de numero telefonico. */
function esTelefonoValido(valor) {
  return typeof valor === 'string' && PATRON_TELEFONO.test(valor);
}

// ---------------------------------------------------------------------
// Clase ColectorErrores
// ---------------------------------------------------------------------

/**
 * Acumula errores de validacion en forma de { campo, mensaje }.
 *
 * Uso tipico dentro de un service:
 *
 *   const errores = new ColectorErrores();
 *   errores.exigirTexto('primerNombre', datos.primerNombre);
 *   errores.exigirFecha('fechaNacimiento', datos.fechaNacimiento);
 *   errores.lanzarSiHay('Los datos del usuario no son validos.');
 *
 * Fijate en el patron: encadenamos comprobaciones y al final una sola
 * linea decide si lanzar la excepcion o continuar.
 */
class ColectorErrores {
  // Atributo privado: nadie puede manipular la lista desde afuera.
  #errores;

  constructor() {
    this.#errores = [];
  }

  // -------- Getters --------

  /** Copia de la lista de errores (para no exponer el arreglo interno). */
  get errores() {
    return [...this.#errores];
  }

  /** Cantidad de errores acumulados. */
  get cantidad() {
    return this.#errores.length;
  }

  /** true si no se encontro ningun error. */
  get esValido() {
    return this.#errores.length === 0;
  }

  // -------- Metodos de registro --------

  /**
   * Agrega un error a la lista.
   * Devuelve `this` para poder encadenar llamadas (patron fluent).
   */
  agregar(campo, mensaje) {
    this.#errores.push({ campo, mensaje });
    return this;
  }

  /**
   * Agrega el error solo si la condicion es verdadera.
   * Es azucar sintactico para no escribir `if` en cada validacion.
   */
  agregarSi(condicion, campo, mensaje) {
    if (condicion) {
      this.agregar(campo, mensaje);
    }
    return this;
  }

  // -------- Validaciones de alto nivel --------
  // Cada metodo valida un tipo de dato completo y agrega todos los
  // errores que encuentre para ese campo.

  /**
   * Campo de texto. Valida presencia, longitud y (opcional) que sean
   * solo letras.
   *
   * @param {string}  campo        Nombre del campo, para el mensaje.
   * @param {*}       valor        Valor a validar.
   * @param {object}  opciones
   * @param {boolean} opciones.requerido   Si es obligatorio (defecto true).
   * @param {number}  opciones.maximo      Longitud maxima (defecto 45).
   * @param {boolean} opciones.soloLetras  Si debe ser solo letras (defecto false).
   */
  exigirTexto(campo, valor, opciones = {}) {
    const {
      requerido = true,
      maximo = LIMITES.VARCHAR_CORTO,
      soloLetras = false
    } = opciones;

    // Caso 1: el campo viene vacio o nulo.
    const estaAusente = valor === null || valor === undefined || valor === '';

    if (estaAusente) {
      // Solo es error si el campo era obligatorio.
      if (requerido) {
        this.agregar(campo, MENSAJES.VALIDACION.REQUERIDO(campo));
      }
      // Si era opcional y no vino, no hay nada mas que validar.
      return this;
    }

    // Caso 2: vino algo pero no es texto.
    if (typeof valor !== 'string') {
      return this.agregar(campo, MENSAJES.VALIDACION.TEXTO(campo));
    }

    // Caso 3: vino texto. Validamos sus reglas.
    this.agregarSi(
      !esTextoNoVacio(valor),
      campo,
      MENSAJES.VALIDACION.REQUERIDO(campo)
    );

    this.agregarSi(
      !cumpleLongitud(valor, maximo),
      campo,
      MENSAJES.VALIDACION.LONGITUD_MAXIMA(campo, maximo)
    );

    if (soloLetras && esTextoNoVacio(valor)) {
      this.agregarSi(
        !esSoloLetras(valor),
        campo,
        MENSAJES.VALIDACION.SOLO_LETRAS(campo)
      );
    }

    return this;
  }

  /**
   * Campo de fecha en formato AAAA-MM-DD.
   * Importamos fechas.js aqui dentro (y no arriba del archivo) para
   * evitar una dependencia circular entre los dos modulos de utils.
   */
  exigirFecha(campo, valor, opciones = {}) {
    const { requerido = true, permitirFutura = false } = opciones;
    const fechas = require('./fechas');

    const estaAusente = valor === null || valor === undefined || valor === '';

    if (estaAusente) {
      if (requerido) {
        this.agregar(campo, MENSAJES.VALIDACION.REQUERIDO(campo));
      }
      return this;
    }

    const iso = fechas.aFechaISO(valor);

    if (iso === null) {
      return this.agregar(campo, MENSAJES.VALIDACION.FECHA_INVALIDA(campo));
    }

    if (!permitirFutura && fechas.esFechaFutura(iso)) {
      this.agregar(campo, MENSAJES.VALIDACION.FECHA_FUTURA(campo));
    }

    return this;
  }

  /** Campo entero, con rango opcional. */
  exigirEntero(campo, valor, opciones = {}) {
    const { requerido = true, minimo = null, maximo = null } = opciones;

    const estaAusente = valor === null || valor === undefined || valor === '';

    if (estaAusente) {
      if (requerido) {
        this.agregar(campo, MENSAJES.VALIDACION.REQUERIDO(campo));
      }
      return this;
    }

    if (!esEntero(valor)) {
      return this.agregar(campo, MENSAJES.VALIDACION.ENTERO(campo));
    }

    if (minimo !== null && maximo !== null && !estaEnRango(valor, minimo, maximo)) {
      this.agregar(campo, MENSAJES.VALIDACION.RANGO(campo, minimo, maximo));
    }

    return this;
  }

  /** Identificador: entero positivo obligatorio. */
  exigirId(campo, valor) {
    if (!esEnteroPositivo(valor)) {
      this.agregar(campo, MENSAJES.VALIDACION.ID_INVALIDO(campo));
    }
    return this;
  }

  /** Campo URL http(s), con tope de longitud. */
  exigirURL(campo, valor, opciones = {}) {
    const { requerido = true, maximo = LIMITES.VARCHAR_CORTO } = opciones;

    const estaAusente = valor === null || valor === undefined || valor === '';

    if (estaAusente) {
      if (requerido) {
        this.agregar(campo, MENSAJES.VALIDACION.REQUERIDO(campo));
      }
      return this;
    }

    if (!esURLValida(valor)) {
      return this.agregar(campo, MENSAJES.VALIDACION.URL_INVALIDA(campo));
    }

    this.agregarSi(
      !cumpleLongitud(valor, maximo),
      campo,
      MENSAJES.VALIDACION.LONGITUD_MAXIMA(campo, maximo)
    );

    return this;
  }

  /** Campo de numero telefonico. */
  exigirTelefono(campo, valor, opciones = {}) {
    const { requerido = true } = opciones;

    const estaAusente = valor === null || valor === undefined || valor === '';

    if (estaAusente) {
      if (requerido) {
        this.agregar(campo, MENSAJES.VALIDACION.REQUERIDO(campo));
      }
      return this;
    }

    this.agregarSi(
      !esTelefonoValido(String(valor)),
      campo,
      MENSAJES.VALIDACION.TELEFONO_INVALIDO
    );

    return this;
  }

  /** El valor debe pertenecer a una lista cerrada. */
  exigirValorDeLista(campo, valor, listaPermitida, opciones = {}) {
    const { requerido = true } = opciones;

    const estaAusente = valor === null || valor === undefined || valor === '';

    if (estaAusente) {
      if (requerido) {
        this.agregar(campo, MENSAJES.VALIDACION.REQUERIDO(campo));
      }
      return this;
    }

    this.agregarSi(
      !estaEnLista(valor, listaPermitida),
      campo,
      MENSAJES.VALIDACION.VALOR_PERMITIDO(campo, listaPermitida)
    );

    return this;
  }

  // -------- Cierre --------

  /**
   * Si hay errores acumulados, lanza un AppError de validacion con la
   * lista completa. Si no hay errores, no hace nada y la ejecucion sigue.
   *
   * Requerimos AppError aqui dentro para evitar dependencia circular.
   */
  lanzarSiHay(mensaje = 'Los datos enviados no son validos.') {
    if (!this.esValido) {
      const AppError = require('./AppError');
      throw AppError.validacion(mensaje, this.errores);
    }
  }
}

module.exports = {
  PATRON_NOMBRE,
  PATRON_TELEFONO,
  PATRON_URL,
  esTextoNoVacio,
  cumpleLongitud,
  esSoloLetras,
  esEntero,
  esEnteroPositivo,
  estaEnRango,
  estaEnLista,
  esURLValida,
  esTelefonoValido,
  ColectorErrores
};
