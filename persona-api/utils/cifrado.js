/**
 * utils/cifrado.js
 * ---------------------------------------------------------------------
 * Modulo DIDACTICO de cifrado y hashing con el modulo nativo `crypto`
 * de Node.js (no requiere instalar nada).
 *
 * IMPORTANTE PARA EL APRENDIZ:
 * Esta version de la API no maneja contrasenias (la tabla USUARIO no
 * tiene esa columna), asi que estas funciones NO se usan en el flujo
 * actual. Estan aqui como referencia para que entiendas tres conceptos
 * que se confunden mucho:
 *
 *   1. HASH          -> transformacion de UNA sola via. No se puede
 *                       revertir. Se usa para contrasenias.
 *   2. HMAC          -> hash con llave secreta. Sirve para firmar y
 *                       verificar que un dato no fue alterado.
 *   3. ENMASCARADO   -> ocultar parte de un dato visible (un telefono)
 *                       para no exponerlo completo en pantalla o logs.
 *                       NO es seguridad, es privacidad de presentacion.
 *
 * REGLA DE ORO: para contrasenias reales en produccion se usa bcrypt,
 * scrypt o argon2, NUNCA un SHA-256 simple. Aqui usamos scrypt, que SI
 * es apto para contrasenias porque es lento a proposito.
 */

const crypto = require('node:crypto');

// Parametros del hash. 16 bytes de sal y 64 bytes de llave derivada
// son los valores recomendados por la documentacion de Node.js.
const BYTES_SAL = 16;
const BYTES_CLAVE = 64;

/**
 * Calcula el hash SHA-256 de un texto y lo devuelve en hexadecimal.
 *
 * Uso valido: generar una huella (checksum) de un archivo o un dato,
 * para comparar si cambio.
 * Uso INVALIDO: guardar contrasenias. SHA-256 es demasiado rapido y
 * un atacante puede probar millones de claves por segundo.
 *
 * @param {string} texto
 * @returns {string} 64 caracteres hexadecimales
 */
function huellaSHA256(texto) {
  return crypto.createHash('sha256').update(String(texto), 'utf8').digest('hex');
}

/**
 * Genera el hash de una contrasenia usando scrypt.
 *
 * Devuelve un solo texto con la sal y el hash separados por ':'
 *   "a1b2...:f9e8..."
 * Guardamos la sal junto al hash porque la necesitamos para verificar,
 * y la sal NO es secreta: su unico trabajo es que dos usuarios con la
 * misma contrasenia tengan hashes distintos.
 *
 * @param {string} contrasenia
 * @returns {string} "sal:hash" en hexadecimal
 */
function hashearContrasenia(contrasenia) {
  // randomBytes genera datos aleatorios criptograficamente seguros.
  const sal = crypto.randomBytes(BYTES_SAL).toString('hex');

  // scryptSync deriva la llave. Es intencionalmente costoso en CPU
  // y memoria para frenar los ataques de fuerza bruta.
  const hash = crypto.scryptSync(String(contrasenia), sal, BYTES_CLAVE).toString('hex');

  return `${sal}:${hash}`;
}

/**
 * Verifica si una contrasenia en texto plano corresponde al hash
 * guardado.
 *
 * Detalle critico: comparamos con timingSafeEqual y NO con ===.
 * El operador === sale del bucle en el primer byte distinto, y medir
 * ese tiempo permite deducir el hash byte por byte (timing attack).
 * timingSafeEqual siempre tarda lo mismo.
 *
 * @param {string} contrasenia  Texto plano que escribio el usuario.
 * @param {string} almacenado   El "sal:hash" guardado en la base.
 * @returns {boolean}
 */
function verificarContrasenia(contrasenia, almacenado) {
  if (typeof almacenado !== 'string' || !almacenado.includes(':')) {
    return false;
  }

  const [sal, hashGuardado] = almacenado.split(':');

  const hashCalculado = crypto.scryptSync(String(contrasenia), sal, BYTES_CLAVE);
  const bufferGuardado = Buffer.from(hashGuardado, 'hex');

  // timingSafeEqual exige que los dos buffers midan lo mismo.
  if (hashCalculado.length !== bufferGuardado.length) {
    return false;
  }

  return crypto.timingSafeEqual(hashCalculado, bufferGuardado);
}

/**
 * Firma un texto con HMAC-SHA256 y una llave secreta.
 * Sirve, por ejemplo, para firmar un token o un enlace temporal.
 *
 * @param {string} texto
 * @param {string} llaveSecreta
 * @returns {string}
 */
function firmarHMAC(texto, llaveSecreta) {
  return crypto
    .createHmac('sha256', String(llaveSecreta))
    .update(String(texto), 'utf8')
    .digest('hex');
}

/**
 * Genera un identificador aleatorio unico (UUID v4).
 * Util para nombres de archivo, tokens de un solo uso, etc.
 *
 * @returns {string} Ejemplo: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
 */
function generarIdentificadorUnico() {
  return crypto.randomUUID();
}

/**
 * Enmascara un dato dejando visibles solo los ultimos N caracteres.
 *
 *   enmascarar("3001234567", 4) -> "******4567"
 *
 * Esto NO es cifrado: el dato original sigue en la base de datos.
 * Se usa para no mostrar informacion completa en pantalla ni en logs.
 *
 * @param {string} valor
 * @param {number} visibles
 * @returns {string|null}
 */
function enmascarar(valor, visibles = 4) {
  if (valor === null || valor === undefined) return null;

  const texto = String(valor);

  // Si el dato es muy corto, lo tapamos completo.
  if (texto.length <= visibles) {
    return '*'.repeat(texto.length);
  }

  const parteOculta = '*'.repeat(texto.length - visibles);
  const parteVisible = texto.slice(-visibles);

  return parteOculta + parteVisible;
}

module.exports = {
  huellaSHA256,
  hashearContrasenia,
  verificarContrasenia,
  firmarHMAC,
  generarIdentificadorUnico,
  enmascarar
};
