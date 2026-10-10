/**
 * js/moleculas/estadoVacio.js
 * ---------------------------------------------------------------------
 * MOLECULA: Estados vacio y de error
 *
 * LOS TRES ESTADOS QUE TODA VISTA CON DATOS DEBE MANEJAR
 * ---------------------------------------------------------------------
 * Es el descuido mas frecuente al aprender frontend: se programa solo
 * el caso feliz (hay datos) y se olvidan los otros dos.
 *
 *   1. CARGANDO -> CargadorBloque o EsqueletoTabla
 *   2. VACIO    -> EstadoVacio        (este archivo)
 *   3. ERROR    -> EstadoError        (este archivo)
 *   4. CON DATOS-> la tabla o la lista
 *
 * Si falta el estado vacio, el usuario ve un rectangulo en blanco y no
 * sabe si la aplicacion se rompio, si sigue cargando o si de verdad no
 * hay nada que mostrar.
 */

import { crear, crearIcono } from '../utiles/dom.js';
import { ICONOS } from '../utiles/iconos.js';
import { Boton } from '../atomos/boton.js';

/**
 * Estado vacio: la consulta funciono pero no devolvio registros.
 *
 * Un buen estado vacio responde tres preguntas:
 *   1. Que pasa?        -> el titulo
 *   2. Por que?         -> el mensaje
 *   3. Que puedo hacer? -> el boton de accion
 *
 * @param {object} propiedades
 * @param {string} propiedades.titulo
 * @param {string} propiedades.mensaje
 * @param {string} propiedades.icono
 * @param {object} propiedades.accion   { texto, onClick }
 * @param {boolean} propiedades.compacto
 */
export function EstadoVacio({
  titulo = 'No hay registros',
  mensaje = 'Todavia no se ha creado ningun registro.',
  icono = 'cajaVacia',
  accion = null,
  compacto = false
} = {}) {
  const hijos = [
    crearIcono(ICONOS[icono] ?? ICONOS.cajaVacia, 'a-icono m-estado-vacio__icono'),
    crear('p', { clase: 'm-estado-vacio__titulo', texto: titulo }),
    crear('p', { clase: 'm-estado-vacio__mensaje', texto: mensaje })
  ];

  if (accion !== null) {
    hijos.push(
      Boton({
        texto: accion.texto,
        variante: 'primario',
        icono: accion.icono ?? 'agregar',
        onClick: accion.onClick
      })
    );
  }

  return crear(
    'div',
    {
      clase: `m-estado-vacio${compacto ? ' m-estado-vacio--compacto' : ''}`
    },
    hijos
  );
}

/**
 * Estado de error: la peticion fallo.
 *
 * A diferencia del estado vacio, aqui SIEMPRE ofrecemos la accion
 * "Reintentar". Muchos errores son temporales (la red se cayo un
 * segundo) y volver a intentar los resuelve, sin obligar al usuario a
 * recargar la pagina entera.
 *
 * Tambien mostramos el mensaje tecnico que devolvio la API. En una
 * aplicacion comercial eso se oculta, pero aqui es DIDACTICO: el
 * aprendiz necesita ver el error real para aprender a diagnosticarlo.
 *
 * @param {object} propiedades
 * @param {import('../servicios/clienteApi.js').ErrorApi} propiedades.error
 * @param {function} propiedades.onReintentar
 */
export function EstadoError({ error, onReintentar = null } = {}) {
  const esSinConexion = error?.esSinConexion === true;

  const hijos = [
    crearIcono(
      esSinConexion ? ICONOS.sinConexion : ICONOS.error,
      'a-icono m-estado-vacio__icono'
    ),
    crear('p', {
      clase: 'm-estado-vacio__titulo',
      texto: esSinConexion ? 'Sin conexion con la API' : 'No se pudieron cargar los datos'
    }),
    crear('p', {
      clase: 'm-estado-vacio__mensaje',
      texto: error?.message ?? 'Ocurrio un error inesperado.'
    })
  ];

  // Pista de diagnostico concreta para el caso mas comun del curso.
  if (esSinConexion) {
    hijos.push(
      crear(
        'div',
        { clase: 'm-estado-vacio__detalle' },
        'Lista de verificacion:\n' +
          '1. El servidor MySQL esta encendido?\n' +
          '2. Ejecutaste "npm start" en la carpeta persona-api?\n' +
          '3. La URL de la API en js/config/configuracion.js es correcta?\n' +
          '4. El origen de este frontend esta en ORIGENES_PERMITIDOS del .env?'
      )
    );
  } else if (error?.estadoHttp) {
    hijos.push(
      crear(
        'div',
        { clase: 'm-estado-vacio__detalle' },
        `HTTP ${error.estadoHttp} · codigo ${error.codigo}`
      )
    );
  }

  if (onReintentar !== null) {
    hijos.push(
      Boton({
        texto: 'Reintentar',
        variante: 'tonal',
        icono: 'recargar',
        onClick: onReintentar
      })
    );
  }

  return crear(
    'div',
    {
      clase: 'm-estado-vacio m-estado-vacio--error',

      // role="alert" para que el lector de pantalla lo anuncie.
      role: 'alert'
    },
    hijos
  );
}
