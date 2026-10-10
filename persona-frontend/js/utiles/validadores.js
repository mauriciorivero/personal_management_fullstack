/**
 * js/utiles/validadores.js
 * ---------------------------------------------------------------------
 * Validaciones del lado del CLIENTE.
 *
 * ================ LA REGLA MAS IMPORTANTE DE TODO EL CURSO ================
 *
 *   LA VALIDACION DEL FRONTEND ES SOLO UNA COMODIDAD.
 *   LA VALIDACION DEL BACKEND ES LA QUE DE VERDAD PROTEGE.
 *
 * Por que? Porque cualquiera puede saltarse el frontend por completo:
 *
 *   curl -X POST http://localhost:3000/api/usuarios \
 *     -H 'Content-Type: application/json' \
 *     -d '{"primerNombre":"<script>alert(1)</script>","edad":-99}'
 *
 * Ese comando no abre el navegador, no carga este archivo y no ejecuta
 * ni una linea de nuestro JavaScript. Si la unica validacion viviera
 * aqui, la base de datos quedaria a merced de cualquiera.
 *
 * ENTONCES, PARA QUE VALIDAR EN EL FRONTEND?
 * Para la EXPERIENCIA DE USUARIO:
 *   - respuesta instantanea, sin esperar el viaje a la red;
 *   - se evitan peticiones que ya sabemos que van a fallar;
 *   - el error se senala justo en el campo donde esta.
 *
 * Por eso las reglas de este archivo son un ESPEJO de las de
 * utils/validadores.js del backend. Si las dos no coinciden, el
 * usuario vera que el formulario pasa y el servidor lo rechaza, que
 * es la peor experiencia posible.
 * =========================================================================
 */

import { CONFIGURACION } from '../config/configuracion.js';

// Las mismas expresiones regulares del backend.
const PATRON_NOMBRE = /^[A-Za-zÀ-ɏḀ-ỿ\s'.-]+$/;
const PATRON_TELEFONO = /^[+]?[\d\s-]{7,20}$/;
const PATRON_URL = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida un campo de texto.
 *
 * @param {string} valor
 * @param {object} opciones
 * @param {string} opciones.etiqueta    Nombre visible del campo.
 * @param {boolean} opciones.requerido
 * @param {number} opciones.maximo
 * @param {boolean} opciones.soloLetras
 * @returns {string|null}  Mensaje de error, o null si es valido.
 */
export function validarTexto(valor, opciones = {}) {
  const {
    etiqueta = 'campo',
    requerido = true,
    maximo = CONFIGURACION.longitudMaximaTexto,
    soloLetras = false
  } = opciones;

  const texto = (valor ?? '').trim();

  if (texto === '') {
    return requerido ? `${etiqueta} es obligatorio.` : null;
  }

  if (texto.length > maximo) {
    return `${etiqueta} no puede superar ${maximo} caracteres.`;
  }

  if (soloLetras && !PATRON_NOMBRE.test(texto)) {
    return `${etiqueta} solo admite letras, espacios, apostrofes y guiones.`;
  }

  return null;
}

/**
 * Valida una fecha y comprueba que no sea futura.
 *
 * No basta con la expresion regular: "2026-02-31" cumple el patron
 * pero no existe. Reconstruimos la fecha y comparamos, igual que en
 * el backend.
 */
export function validarFecha(valor, opciones = {}) {
  const { etiqueta = 'La fecha', requerido = true, permitirFutura = false } = opciones;

  const texto = (valor ?? '').trim();

  if (texto === '') {
    return requerido ? `${etiqueta} es obligatoria.` : null;
  }

  if (!PATRON_FECHA.test(texto)) {
    return `${etiqueta} debe tener el formato AAAA-MM-DD.`;
  }

  const [anio, mes, dia] = texto.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);

  // Si JavaScript "corrigio" la fecha, era invalida.
  const esReal =
    fecha.getFullYear() === anio &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia;

  if (!esReal) {
    return `${etiqueta} no corresponde a un dia real del calendario.`;
  }

  if (!permitirFutura) {
    const hoy = new Date();
    // Comparamos solo la parte de fecha, ignorando la hora.
    hoy.setHours(0, 0, 0, 0);

    if (fecha > hoy) {
      return `${etiqueta} no puede ser una fecha futura.`;
    }
  }

  return null;
}

/** Valida un numero de telefono. */
export function validarTelefono(valor, opciones = {}) {
  const { etiqueta = 'El numero de telefono', requerido = true } = opciones;
  const texto = (valor ?? '').trim();

  if (texto === '') {
    return requerido ? `${etiqueta} es obligatorio.` : null;
  }

  if (!PATRON_TELEFONO.test(texto)) {
    return `${etiqueta} solo admite digitos, espacios, el signo + y guiones (entre 7 y 20 caracteres).`;
  }

  return null;
}

/** Valida una URL http(s). */
export function validarURL(valor, opciones = {}) {
  const {
    etiqueta = 'La URL',
    requerido = true,
    maximo = CONFIGURACION.longitudMaximaTexto
  } = opciones;

  const texto = (valor ?? '').trim();

  if (texto === '') {
    return requerido ? `${etiqueta} es obligatoria.` : null;
  }

  if (!PATRON_URL.test(texto)) {
    return `${etiqueta} debe empezar con http:// o https://`;
  }

  if (texto.length > maximo) {
    return `${etiqueta} no puede superar ${maximo} caracteres (limite del modelo de datos).`;
  }

  return null;
}

/** Valida que el valor sea un id entero positivo. */
export function validarId(valor, opciones = {}) {
  const { etiqueta = 'El identificador', requerido = true } = opciones;

  const texto = String(valor ?? '').trim();

  if (texto === '') {
    return requerido ? `${etiqueta} es obligatorio.` : null;
  }

  const numero = Number(texto);

  if (!Number.isInteger(numero) || numero <= 0) {
    return `${etiqueta} debe ser un numero entero mayor que cero.`;
  }

  return null;
}

/** Valida que el valor este en una lista cerrada de opciones. */
export function validarOpcion(valor, listaPermitida, opciones = {}) {
  const { etiqueta = 'El valor', requerido = true } = opciones;

  const texto = (valor ?? '').trim();

  if (texto === '') {
    return requerido ? `${etiqueta} es obligatorio.` : null;
  }

  if (!listaPermitida.includes(texto)) {
    return `${etiqueta} solo admite: ${listaPermitida.join(', ')}.`;
  }

  return null;
}

/**
 * Calcula la edad a partir de la fecha de nacimiento.
 *
 * Es la MISMA logica que utils/fechas.js del backend. La repetimos
 * aqui solo para mostrar la edad en vivo mientras el usuario escribe
 * la fecha.
 *
 * ACLARACION IMPORTANTE: este calculo es informativo. El valor que
 * se guarda en la base de datos es el que calcula el SERVIDOR, nunca
 * este. Si los dos difirieran, el servidor manda.
 *
 * @param {string} fechaISO
 * @returns {number|null}
 */
export function calcularEdad(fechaISO) {
  if (!PATRON_FECHA.test((fechaISO ?? '').trim())) return null;

  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const hoy = new Date();

  let edad = hoy.getFullYear() - anio;

  const mesActual = hoy.getMonth() + 1;
  const diaActual = hoy.getDate();
  const cumpleYaPaso = mesActual > mes || (mesActual === mes && diaActual >= dia);

  if (!cumpleYaPaso) edad -= 1;

  return edad < 0 ? 0 : edad;
}
