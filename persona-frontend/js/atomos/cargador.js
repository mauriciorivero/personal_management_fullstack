/**
 * js/atomos/cargador.js
 * ---------------------------------------------------------------------
 * ATOMO: Indicadores de carga
 *
 * Una peticion a la API tarda. Sin un indicador, el usuario ve la
 * pantalla quieta y no sabe si la aplicacion trabaja o se rompio.
 *
 * ACCESIBILIDAD: el contenedor lleva role="status" y
 * aria-live="polite" para que el lector de pantalla anuncie el cambio
 * de estado sin interrumpir lo que el usuario estuviera escuchando.
 */

import { crear } from '../utiles/dom.js';

/** Spinner circular simple. */
export function Cargador({ tamano = null } = {}) {
  const clases = ['a-cargador', tamano && `a-cargador--${tamano}`]
    .filter(Boolean)
    .join(' ');

  return crear('span', {
    clase: clases,

    // El spinner es decorativo: el texto lo pone CargadorBloque.
    ariaHidden: 'true'
  });
}

/**
 * Bloque de carga centrado, con mensaje. Para llenar un panel entero
 * mientras llegan los datos.
 */
export function CargadorBloque({ mensaje = 'Cargando datos...' } = {}) {
  return crear(
    'div',
    {
      clase: 'a-cargador-bloque',

      // role="status" + aria-live="polite" = el lector anuncia el
      // mensaje cuando este elemento aparece en el DOM.
      role: 'status',
      ariaLive: 'polite'
    },
    Cargador({ tamano: 'grande' }),
    crear('p', { texto: mensaje })
  );
}

/** Barra de progreso indeterminada, para la parte superior de un panel. */
export function BarraProgreso() {
  return crear('div', {
    clase: 'a-barra-progreso',
    role: 'progressbar',

    // Sin aria-valuenow, el lector entiende que es indeterminada.
    ariaLabel: 'Cargando'
  });
}

/**
 * Esqueleto de tabla: filas grises que ocupan el lugar de los datos.
 *
 * Se percibe mas rapido que un spinner porque el usuario ya ve la
 * FORMA de lo que va a llegar. Es una tecnica de percepcion, no de
 * velocidad real.
 *
 * @param {number} filas
 * @param {number} columnas
 */
export function EsqueletoTabla({ filas = 5, columnas = 5 } = {}) {
  const cuerpo = crear('tbody', {});

  for (let f = 0; f < filas; f += 1) {
    const fila = crear('tr', { clase: 'o-tabla-datos__fila' });

    for (let c = 0; c < columnas; c += 1) {
      fila.appendChild(
        crear(
          'td',
          { clase: 'o-tabla-datos__celda' },
          crear('div', {
            clase: 'a-esqueleto a-esqueleto--texto',

            // Anchos variables para que parezca contenido real y no
            // una cuadricula perfecta.
            estilo: { width: `${50 + ((f * 13 + c * 17) % 45)}%` }
          })
        )
      );
    }

    cuerpo.appendChild(fila);
  }

  return crear(
    'div',
    { clase: 'o-tabla-datos__contenedor', ariaHidden: 'true' },
    crear('table', { clase: 'o-tabla-datos' }, cuerpo)
  );
}
