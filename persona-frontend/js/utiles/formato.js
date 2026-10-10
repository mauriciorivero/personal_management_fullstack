/**
 * js/utiles/formato.js
 * ---------------------------------------------------------------------
 * Funciones de PRESENTACION: convierten datos en texto legible.
 *
 * CONCEPTO IMPORTANTE: separar el DATO de su PRESENTACION.
 *
 *   El dato         "1906-12-09"          <- lo que viaja y se guarda
 *   La presentacion "9 de diciembre de 1906" <- lo que ve el usuario
 *
 * El dato siempre va en formato ISO porque es ordenable, universal y
 * no depende del idioma. La presentacion se genera al pintar, aqui.
 *
 * Fijate en la simetria con el backend: utils/fechas.js hace lo mismo
 * del lado del servidor. Los dos extremos comparten la misma idea.
 */

/**
 * Formatea una fecha ISO en texto largo en espanol.
 *
 *   "1906-12-09" -> "9 de diciembre de 1906"
 *
 * Usamos Intl.DateTimeFormat, la API nativa de internacionalizacion.
 * Trae los nombres de los meses de los 150 idiomas que conoce el
 * navegador: no hay que escribir el arreglo de meses a mano.
 *
 * DETALLE CRITICO DE ZONA HORARIA
 * new Date("1906-12-09") interpreta el texto como UTC. Si estas en
 * Colombia (UTC-5), el navegador lo convierte a la hora local y
 * resulta "8 de diciembre": un dia menos.
 *
 * La solucion es construir la fecha con los numeros separados, lo que
 * crea la fecha en horario LOCAL y evita el corrimiento.
 *
 * @param {string|null} fechaISO  Formato "AAAA-MM-DD".
 * @returns {string}
 */
export function fechaLarga(fechaISO) {
  if (!fechaISO) return '—';

  const [anio, mes, dia] = String(fechaISO).slice(0, 10).split('-').map(Number);

  // Si algo no es numero, devolvemos el texto original sin romper nada.
  if (!anio || !mes || !dia) return String(fechaISO);

  // El mes en JavaScript va de 0 a 11.
  const fecha = new Date(anio, mes - 1, dia);

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(fecha);
}

/**
 * Formatea una fecha ISO en formato corto.
 *   "1906-12-09" -> "09/12/1906"
 */
export function fechaCorta(fechaISO) {
  if (!fechaISO) return '—';

  const [anio, mes, dia] = String(fechaISO).slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return String(fechaISO);

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(anio, mes - 1, dia));
}

/**
 * Formatea un numero con separador de miles.
 *   1234567 -> "1.234.567"
 */
export function numero(valor) {
  if (valor === null || valor === undefined) return '0';
  return new Intl.NumberFormat('es-CO').format(valor);
}

/**
 * Extrae las iniciales de un nombre completo, para el avatar.
 *
 *   "Grace Brewster Hopper Murray" -> "GH"
 *
 * Tomamos la primera y la ULTIMA palabra, no las dos primeras: en
 * espanol eso da la inicial del nombre y la del apellido, que es lo
 * que se espera.
 *
 * @param {string} nombreCompleto
 * @returns {string}
 */
export function iniciales(nombreCompleto) {
  if (!nombreCompleto) return '?';

  const palabras = String(nombreCompleto).trim().split(/\s+/).filter(Boolean);

  if (palabras.length === 0) return '?';
  if (palabras.length === 1) return palabras[0].charAt(0).toUpperCase();

  // at(-1) es la forma moderna de obtener el ultimo elemento.
  const primera = palabras[0].charAt(0);
  const ultima = palabras.at(-1).charAt(0);

  return (primera + ultima).toUpperCase();
}

/**
 * Recorta un texto largo agregando puntos suspensivos.
 *
 * Se usa para las URL en las tablas. Ojo: es un recorte de
 * PRESENTACION; el dato completo sigue intacto en el atributo title
 * del elemento, para que el usuario lo vea al pasar el puntero.
 *
 * @param {string} texto
 * @param {number} maximo
 * @returns {string}
 */
export function recortar(texto, maximo = 40) {
  if (!texto) return '';

  const cadena = String(texto);
  if (cadena.length <= maximo) return cadena;

  // Restamos 1 por el caracter de puntos suspensivos.
  return cadena.slice(0, maximo - 1) + '…';
}

/**
 * Quita el protocolo y el "www." de una URL, para mostrarla compacta.
 *   "https://www.instagram.com/ada" -> "instagram.com/ada"
 */
export function urlCompacta(url) {
  if (!url) return '—';

  return String(url)
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}

/**
 * Convierte el valor de estado (1 o 0) en texto.
 * @param {number} estado
 * @returns {string}
 */
export function textoEstado(estado) {
  return Number(estado) === 1 ? 'Activo' : 'Inactivo';
}

/**
 * Devuelve un valor o un guion largo si esta vacio.
 *
 * Por que un guion y no una celda en blanco?
 * Porque la celda vacia es ambigua: el usuario no sabe si el dato no
 * existe o si la aplicacion fallo al cargarlo. El guion comunica de
 * forma explicita "aqui no hay dato".
 *
 * @param {*} valor
 * @returns {string}
 */
export function oGuion(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  return String(valor);
}
