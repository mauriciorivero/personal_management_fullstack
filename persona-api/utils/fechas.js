/**
 * utils/fechas.js
 * ---------------------------------------------------------------------
 * Todo lo relacionado con fechas en un solo lugar.
 *
 * Por que un modulo aparte? Porque las fechas son la principal fuente
 * de bugs en cualquier aplicacion:
 *   - El frontend trabaja con el formato ISO  "1995-07-24"
 *   - MySQL guarda DATETIME                   "1995-07-24 00:00:00"
 *   - JavaScript usa objetos Date
 * Si cada capa convierte a su manera, aparecen fechas corridas un dia.
 * Aqui definimos UNA sola forma de convertir y la usamos en toda la app.
 *
 * REGLA IMPORTANTE: usamos los getters LOCALES (getFullYear, getMonth,
 * getDate) y no los UTC. El driver de MySQL devuelve el DATETIME como
 * un Date en la zona horaria local, asi que leerlo en local evita el
 * clasico error de "me restó un dia".
 */

// Expresion regular para el formato AAAA-MM-DD exacto.
// ^        inicio del texto
// \d{4}    exactamente 4 digitos (anio)
// -        guion literal
// \d{2}    exactamente 2 digitos (mes)
// $        fin del texto
const PATRON_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/**
 * Agrega un cero a la izquierda si el numero tiene un solo digito.
 * padStart(2, '0') convierte 7 en "07".
 */
function dosDigitos(numero) {
  return String(numero).padStart(2, '0');
}

/**
 * Valida que el texto sea una fecha real en formato AAAA-MM-DD.
 * No basta con la expresion regular: "2026-02-31" cumple el patron
 * pero no existe. Por eso reconstruimos la fecha y comparamos.
 *
 * @param {string} texto
 * @returns {boolean}
 */
function esFechaISOValida(texto) {
  if (typeof texto !== 'string' || !PATRON_FECHA_ISO.test(texto)) {
    return false;
  }

  // Separamos el texto y lo convertimos a numeros.
  const [anio, mes, dia] = texto.split('-').map(Number);

  // Construimos la fecha. El mes en JavaScript va de 0 a 11,
  // por eso restamos 1.
  const fecha = new Date(anio, mes - 1, dia);

  // Si JavaScript "corrigio" la fecha (por ejemplo 31 de febrero ->
  // 2 o 3 de marzo), los componentes ya no coinciden: era invalida.
  return (
    fecha.getFullYear() === anio &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia
  );
}

/**
 * Convierte cualquier entrada (Date, "1995-07-24" o
 * "1995-07-24T00:00:00.000Z") al formato ISO corto "AAAA-MM-DD".
 *
 * @param {Date|string|null} valor
 * @returns {string|null}
 */
function aFechaISO(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }

  // Si ya es un Date valido lo formateamos directamente.
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null;
    return `${valor.getFullYear()}-${dosDigitos(valor.getMonth() + 1)}-${dosDigitos(valor.getDate())}`;
  }

  // Si es texto, nos quedamos con los primeros 10 caracteres
  // ("1995-07-24T00:00:00Z" -> "1995-07-24").
  const texto = String(valor).slice(0, 10);
  return esFechaISOValida(texto) ? texto : null;
}

/**
 * Convierte "AAAA-MM-DD" al formato DATETIME que espera MySQL.
 * La columna fecha_nacimiento es DATETIME, asi que completamos la
 * hora con 00:00:00 (medianoche).
 *
 * @param {Date|string} valor
 * @returns {string|null}  Ejemplo: "1995-07-24 00:00:00"
 */
function aFechaMySQL(valor) {
  const iso = aFechaISO(valor);
  return iso === null ? null : `${iso} 00:00:00`;
}

/**
 * Indica si la fecha recibida es posterior a hoy.
 * Sirve para rechazar fechas de nacimiento en el futuro.
 *
 * @param {Date|string} valor
 * @returns {boolean}
 */
function esFechaFutura(valor) {
  const iso = aFechaISO(valor);
  if (iso === null) return false;

  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${dosDigitos(hoy.getMonth() + 1)}-${dosDigitos(hoy.getDate())}`;

  // Al comparar textos "AAAA-MM-DD" alfabeticamente obtenemos el mismo
  // resultado que comparando fechas, porque el formato es ordenable.
  return iso > hoyISO;
}

/**
 * Calcula la edad en anios CUMPLIDOS a partir de la fecha de nacimiento.
 *
 * Regla de negocio: la API nunca confia en la edad que envia el cliente,
 * siempre la recalcula aqui. Asi la columna `edad` jamas queda
 * desincronizada con `fecha_nacimiento`.
 *
 * @param {Date|string} fechaNacimiento
 * @returns {number|null}
 */
function calcularEdad(fechaNacimiento) {
  const iso = aFechaISO(fechaNacimiento);
  if (iso === null) return null;

  const [anio, mes, dia] = iso.split('-').map(Number);
  const hoy = new Date();

  // Diferencia bruta de anios.
  let edad = hoy.getFullYear() - anio;

  // Si todavia no ha llegado el cumpleanios de este anio, restamos 1.
  const mesActual = hoy.getMonth() + 1;
  const diaActual = hoy.getDate();
  const cumpleYaPaso = mesActual > mes || (mesActual === mes && diaActual >= dia);

  if (!cumpleYaPaso) {
    edad -= 1;
  }

  // Nunca devolvemos edades negativas.
  return edad < 0 ? 0 : edad;
}

/**
 * Formatea una fecha en texto legible en espanol.
 * Ejemplo: "1995-07-24" -> "24 de julio de 1995"
 *
 * @param {Date|string} valor
 * @returns {string|null}
 */
function aTextoLargo(valor) {
  const iso = aFechaISO(valor);
  if (iso === null) return null;

  const [anio, mes, dia] = iso.split('-').map(Number);
  return `${dia} de ${MESES_ES[mes - 1]} de ${anio}`;
}

/**
 * Marca de tiempo actual en formato ISO, para los logs.
 * Ejemplo: "2026-10-09T21:15:04.512Z"
 */
function ahoraISO() {
  return new Date().toISOString();
}

module.exports = {
  PATRON_FECHA_ISO,
  esFechaISOValida,
  aFechaISO,
  aFechaMySQL,
  esFechaFutura,
  calcularEdad,
  aTextoLargo,
  ahoraISO
};
