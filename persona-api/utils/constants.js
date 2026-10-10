/**
 * utils/constants.js
 * ---------------------------------------------------------------------
 * Constantes de toda la aplicacion.
 *
 * Por que un archivo de constantes?
 * Para no repetir "numeros magicos" ni textos sueltos por el codigo.
 * Si manana el estado activo cambia de 1 a 'A', se cambia en UN solo
 * lugar y toda la aplicacion queda consistente.
 *
 * Object.freeze() congela el objeto: nadie puede modificarlo en tiempo
 * de ejecucion. Es la forma de simular una constante "de verdad" en JS.
 */

// Codigos de estado HTTP que usa la API.
const HTTP = Object.freeze({
  OK: 200,                    // Peticion exitosa
  CREADO: 201,                // Recurso creado (respuesta de POST)
  SIN_CONTENIDO: 204,         // Exito pero sin cuerpo de respuesta
  SOLICITUD_INCORRECTA: 400,  // El cliente envio datos invalidos
  NO_ENCONTRADO: 404,         // El recurso no existe
  CONFLICTO: 409,             // Choca con una regla de negocio (duplicado)
  ENTIDAD_NO_PROCESABLE: 422, // Fallo de validacion semantica
  ERROR_SERVIDOR: 500         // Error inesperado del servidor
});

// Codigos internos de error. Viajan en la respuesta JSON para que el
// frontend pueda reaccionar sin tener que leer el texto del mensaje.
const CODIGO_ERROR = Object.freeze({
  VALIDACION: 'VALIDACION',
  NO_ENCONTRADO: 'NO_ENCONTRADO',
  DUPLICADO: 'DUPLICADO',
  LLAVE_FORANEA: 'LLAVE_FORANEA',
  BASE_DATOS: 'BASE_DATOS',
  RUTA_NO_ENCONTRADA: 'RUTA_NO_ENCONTRADA',
  INTERNO: 'INTERNO'
});

// Estado de un USUARIO (columna `estado`).
const ESTADO_USUARIO = Object.freeze({
  INACTIVO: 0,
  ACTIVO: 1
});

// Estado de un TELEFONO (columna `activo`).
const ESTADO_TELEFONO = Object.freeze({
  INACTIVO: 0,
  ACTIVO: 1
});

// Valores permitidos para TELEFONO.tipo_telefono.
const TIPOS_TELEFONO = Object.freeze(['Celular', 'Fijo', 'Trabajo', 'Casa', 'Otro']);

// Limites que vienen del modelo relacional (VARCHAR(45)).
// Validamos en la API para dar un error claro ANTES de llegar a MySQL.
const LIMITES = Object.freeze({
  VARCHAR_CORTO: 45,
  EDAD_MINIMA: 0,
  EDAD_MAXIMA: 130,
  PAGINA_DEFECTO: 1,
  LIMITE_DEFECTO: 50,
  LIMITE_MAXIMO: 200
});

// Nombres de las tablas. Evita errores de tipeo en las consultas SQL.
const TABLAS = Object.freeze({
  USUARIO: 'USUARIO',
  TELEFONO: 'TELEFONO',
  RED_SOCIAL: 'RED_SOCIAL',
  PERFIL_SOCIAL: 'PERFIL_SOCIAL'
});

module.exports = {
  HTTP,
  CODIGO_ERROR,
  ESTADO_USUARIO,
  ESTADO_TELEFONO,
  TIPOS_TELEFONO,
  LIMITES,
  TABLAS
};
