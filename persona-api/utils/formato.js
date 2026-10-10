/**
 * utils/formato.js
 * ---------------------------------------------------------------------
 * Funciones de NORMALIZACION: dejan los datos "limpios" antes de
 * validarlos y antes de guardarlos.
 *
 * Diferencia clave que hay que entender:
 *   - FORMATEAR  = transformar el dato      ("  ana  " -> "Ana")
 *   - VALIDAR    = decidir si es aceptable  ("Ana" -> true)
 *
 * Siempre se formatea PRIMERO y se valida DESPUES. Si no, un nombre
 * escrito como "   " (solo espacios) pasaria la validacion de
 * "no esta vacio" cuando en realidad no tiene contenido.
 */

/**
 * Quita espacios al inicio y al final, y colapsa los espacios
 * internos repetidos en uno solo.
 * Devuelve null si al final no queda nada.
 *
 *   "  Juan   Carlos  " -> "Juan Carlos"
 *   "     "             -> null
 *
 * @param {*} valor
 * @returns {string|null}
 */
function limpiarTexto(valor) {
  if (valor === null || valor === undefined) return null;

  // replace(/\s+/g, ' ') cambia cualquier grupo de espacios, tabulaciones
  // o saltos de linea por un unico espacio.
  const texto = String(valor).trim().replace(/\s+/g, ' ');

  return texto.length === 0 ? null : texto;
}

/**
 * Pasa un texto a "Titulo Propio": primera letra de cada palabra en
 * mayuscula y el resto en minuscula.
 *
 *   "MARIA del carmen" -> "Maria Del Carmen"
 *
 * @param {*} valor
 * @returns {string|null}
 */
function aTituloPropio(valor) {
  const texto = limpiarTexto(valor);
  if (texto === null) return null;

  return texto
    .toLocaleLowerCase('es')
    .split(' ')
    .map((palabra) =>
      palabra.charAt(0).toLocaleUpperCase('es') + palabra.slice(1)
    )
    .join(' ');
}

/**
 * Normaliza un numero de telefono: deja solo digitos, el signo + y
 * guiones, y quita los espacios.
 *
 *   "+57 (300) 123-4567" -> "+57300123-4567"
 *
 * @param {*} valor
 * @returns {string|null}
 */
function normalizarTelefono(valor) {
  const texto = limpiarTexto(valor);
  if (texto === null) return null;

  // [^...] significa "todo lo que NO este en esta lista".
  return texto.replace(/[^\d+-]/g, '');
}

/**
 * Normaliza una URL: quita espacios, pasa el dominio a minusculas y
 * elimina la barra final para que no se guarden duplicados del tipo
 * "https://x.com" y "https://x.com/".
 *
 * @param {*} valor
 * @returns {string|null}
 */
function normalizarURL(valor) {
  const texto = limpiarTexto(valor);
  if (texto === null) return null;

  // Quita una o varias barras finales.
  const sinBarraFinal = texto.replace(/\/+$/, '');
  return sinBarraFinal.length === 0 ? null : sinBarraFinal;
}

/**
 * Convierte el valor a entero. Devuelve null si no es convertible.
 * Number.parseInt("12abc") daria 12, lo cual es peligroso, por eso
 * primero comprobamos con una expresion regular que SOLO haya digitos.
 *
 * @param {*} valor
 * @returns {number|null}
 */
function aEnteroONulo(valor) {
  if (valor === null || valor === undefined || valor === '') return null;

  const texto = String(valor).trim();

  // Signo opcional seguido de uno o mas digitos, y nada mas.
  if (!/^[+-]?\d+$/.test(texto)) return null;

  return Number.parseInt(texto, 10);
}

/**
 * Convierte valores "parecidos a booleano" en 1 o 0, que es lo que
 * guardan las columnas INT `estado` y `activo` del modelo.
 *
 *   1, "1", true, "true", "activo"  -> 1
 *   0, "0", false, "false"          -> 0
 *   cualquier otra cosa             -> valorPorDefecto
 *
 * @param {*} valor
 * @param {number|null} valorPorDefecto
 * @returns {number|null}
 */
function aBanderaEntera(valor, valorPorDefecto = null) {
  if (valor === null || valor === undefined || valor === '') return valorPorDefecto;

  const texto = String(valor).trim().toLowerCase();

  if (['1', 'true', 'si', 'activo'].includes(texto)) return 1;
  if (['0', 'false', 'no', 'inactivo'].includes(texto)) return 0;

  return valorPorDefecto;
}

/**
 * Deja en el objeto UNICAMENTE las propiedades de la lista blanca.
 *
 * Esto evita el ataque de "mass assignment": si el cliente envia
 * { primerNombre: "Ana", id: 999, estado: 1 } no queremos que pueda
 * cambiar el id a su antojo. Solo copiamos lo que la API permite.
 *
 * @param {object} objeto
 * @param {string[]} camposPermitidos
 * @returns {object}
 */
function soloCamposPermitidos(objeto, camposPermitidos) {
  const resultado = {};

  if (objeto === null || typeof objeto !== 'object') return resultado;

  for (const campo of camposPermitidos) {
    // Object.hasOwn comprueba que la propiedad sea del objeto mismo
    // y no heredada del prototipo.
    if (Object.hasOwn(objeto, campo)) {
      resultado[campo] = objeto[campo];
    }
  }

  return resultado;
}

/**
 * Indica si un objeto no tiene ninguna propiedad propia.
 * Se usa para rechazar peticiones PUT/POST con el cuerpo vacio.
 *
 * @param {object} objeto
 * @returns {boolean}
 */
function estaVacio(objeto) {
  return (
    objeto === null ||
    objeto === undefined ||
    typeof objeto !== 'object' ||
    Object.keys(objeto).length === 0
  );
}

module.exports = {
  limpiarTexto,
  aTituloPropio,
  normalizarTelefono,
  normalizarURL,
  aEnteroONulo,
  aBanderaEntera,
  soloCamposPermitidos,
  estaVacio
};
