/**
 * utils/mensajes.js
 * ---------------------------------------------------------------------
 * Catalogo centralizado de mensajes para el usuario final.
 *
 * Ventajas de centralizarlos:
 *  1. Consistencia: el mismo error siempre dice lo mismo.
 *  2. Traduccion: si manana la app debe estar en ingles, se traduce
 *     este archivo y nada mas.
 *  3. Pruebas: los tests comparan contra la constante, no contra texto
 *     escrito a mano.
 *
 * Algunos mensajes son FUNCIONES (plantillas) porque necesitan recibir
 * un dato, por ejemplo el nombre del campo que fallo.
 */

const MENSAJES = Object.freeze({
  // ---------- Mensajes de exito ----------
  EXITO: Object.freeze({
    LISTA: (entidad) => `Lista de ${entidad} obtenida correctamente.`,
    DETALLE: (entidad) => `${entidad} encontrado correctamente.`,
    CREADO: (entidad) => `${entidad} creado correctamente.`,
    ACTUALIZADO: (entidad) => `${entidad} actualizado correctamente.`,
    ELIMINADO: (entidad) => `${entidad} eliminado correctamente.`
  }),

  // ---------- Mensajes de validacion ----------
  VALIDACION: Object.freeze({
    CUERPO_VACIO: 'El cuerpo de la peticion no puede estar vacio.',
    REQUERIDO: (campo) => `El campo "${campo}" es obligatorio.`,
    TEXTO: (campo) => `El campo "${campo}" debe ser texto.`,
    LONGITUD_MAXIMA: (campo, max) =>
      `El campo "${campo}" no puede superar ${max} caracteres.`,
    SOLO_LETRAS: (campo) =>
      `El campo "${campo}" solo admite letras, espacios, apostrofes y guiones.`,
    FECHA_INVALIDA: (campo) =>
      `El campo "${campo}" debe tener el formato AAAA-MM-DD (por ejemplo 1995-07-24).`,
    FECHA_FUTURA: (campo) => `El campo "${campo}" no puede ser una fecha futura.`,
    ENTERO: (campo) => `El campo "${campo}" debe ser un numero entero.`,
    ENTERO_POSITIVO: (campo) =>
      `El campo "${campo}" debe ser un numero entero mayor que cero.`,
    RANGO: (campo, min, max) =>
      `El campo "${campo}" debe estar entre ${min} y ${max}.`,
    VALOR_PERMITIDO: (campo, valores) =>
      `El campo "${campo}" solo admite estos valores: ${valores.join(', ')}.`,
    URL_INVALIDA: (campo) =>
      `El campo "${campo}" debe ser una URL valida que empiece con http:// o https://.`,
    TELEFONO_INVALIDO:
      'El numero de telefono solo admite digitos, espacios, signo + y guiones (entre 7 y 20 caracteres).',
    ID_INVALIDO: (campo) =>
      `El parametro "${campo}" de la URL debe ser un numero entero positivo.`
  }),

  // ---------- Mensajes de negocio ----------
  NEGOCIO: Object.freeze({
    NO_ENCONTRADO: (entidad, id) => `No existe ${entidad} con id ${id}.`,
    USUARIO_NO_EXISTE: (id) => `No existe un usuario con id ${id}.`,
    RED_SOCIAL_NO_EXISTE: (id) => `No existe una red social con id ${id}.`,
    PERFIL_NO_ENCONTRADO: (redSocialId, usuarioId) =>
      `No existe un perfil social para la red ${redSocialId} y el usuario ${usuarioId}.`,
    PERFIL_DUPLICADO: (redSocialId, usuarioId) =>
      `El usuario ${usuarioId} ya tiene un perfil registrado en la red social ${redSocialId}.`,
    RED_SOCIAL_DUPLICADA: (nombre) => `Ya existe una red social llamada "${nombre}".`,
    TELEFONO_DUPLICADO: (numero) => `El numero de telefono "${numero}" ya esta registrado.`,
    RED_SOCIAL_EN_USO: (id) =>
      `No se puede eliminar la red social ${id} porque tiene perfiles sociales asociados.`
  }),

  // ---------- Mensajes de sistema ----------
  SISTEMA: Object.freeze({
    RUTA_NO_ENCONTRADA: (metodo, ruta) =>
      `La ruta ${metodo} ${ruta} no existe en esta API.`,
    ERROR_INTERNO:
      'Ocurrio un error inesperado en el servidor. Revisa los logs para mas detalle.',
    ERROR_BASE_DATOS: 'Ocurrio un error al consultar la base de datos.',
    JSON_MAL_FORMADO: 'El cuerpo de la peticion no es un JSON valido.',
    VARIABLE_ENTORNO_FALTANTE: (nombre) =>
      `Falta la variable de entorno "${nombre}". Revisa tu archivo .env`
  })
});

module.exports = MENSAJES;
