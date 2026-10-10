/**
 * js/atomos/boton.js
 * ---------------------------------------------------------------------
 * ATOMO: Boton
 *
 * ATOMIC DESIGN APLICADO AL JAVASCRIPT
 * La jerarquia del Atomic Design no es solo para el CSS: tambien
 * organiza los componentes de JavaScript, en las mismas carpetas y
 * con las mismas reglas.
 *
 * Un componente atomo cumple tres condiciones:
 *   1. No importa ningun otro componente (solo utilidades).
 *   2. No sabe nada de la API ni del estado de la aplicacion.
 *   3. Es una funcion PURA de presentacion: con las mismas
 *      propiedades siempre produce el mismo elemento.
 *
 * Esa pureza es lo que lo hace reutilizable y facil de probar.
 */

import { crear, crearIcono } from '../utiles/dom.js';
import { ICONOS } from '../utiles/iconos.js';

/**
 * Crea un boton.
 *
 * @param {object} propiedades
 * @param {string} propiedades.texto     Texto visible.
 * @param {string} propiedades.variante  primario | tonal | contorno | texto | peligro
 * @param {string} propiedades.icono     Nombre de un icono de ICONOS.
 * @param {function} propiedades.onClick Manejador del clic.
 * @param {boolean} propiedades.deshabilitado
 * @param {boolean} propiedades.bloque   Ocupa todo el ancho.
 * @param {string} propiedades.tipo      button | submit | reset
 * @param {string} propiedades.titulo    Texto del tooltip.
 * @returns {HTMLButtonElement}
 */
export function Boton({
  texto = '',
  variante = 'primario',
  icono = null,
  onClick = null,
  deshabilitado = false,
  bloque = false,
  tipo = 'button',
  titulo = null
} = {}) {
  // Armamos la lista de clases desde las propiedades. filter(Boolean)
  // descarta los false, asi no quedan espacios dobles en el atributo.
  const clases = [
    'a-boton',
    `a-boton--${variante}`,
    bloque && 'a-boton--bloque'
  ]
    .filter(Boolean)
    .join(' ');

  const hijos = [];

  // El icono va antes del texto.
  if (icono !== null && ICONOS[icono]) {
    hijos.push(crearIcono(ICONOS[icono], 'a-icono a-boton__icono'));
  }

  if (texto !== '') {
    hijos.push(crear('span', { texto }));
  }

  return crear(
    'button',
    {
      clase: clases,

      // type="button" es importante: sin el, un boton dentro de un
      // <form> actua como submit y envia el formulario sin querer.
      // Es un bug clasico y muy molesto de encontrar.
      type: tipo,

      disabled: deshabilitado,
      title: titulo,
      onClick
    },
    hijos
  );
}

/**
 * Crea un boton que solo contiene un icono.
 *
 * ACCESIBILIDAD OBLIGATORIA: un boton sin texto necesita aria-label.
 * Sin el, el lector de pantalla anuncia solo "boton" y la persona no
 * tiene forma de saber que hace.
 *
 * Por eso aqui `etiqueta` NO tiene valor por defecto: si falta, el
 * desarrollador vera un aria-label vacio y se dara cuenta del error.
 *
 * @param {object} propiedades
 * @param {string} propiedades.icono     Nombre del icono (obligatorio).
 * @param {string} propiedades.etiqueta  Descripcion para aria-label.
 */
export function BotonIcono({
  icono,
  etiqueta,
  variante = 'icono',
  onClick = null,
  deshabilitado = false,
  pequeno = false,
  titulo = null
} = {}) {
  const clases = [
    'a-boton',
    `a-boton--${variante}`,
    pequeno && 'a-boton--icono-pequeno'
  ]
    .filter(Boolean)
    .join(' ');

  return crear(
    'button',
    {
      clase: clases,
      type: 'button',

      // El lector de pantalla lee este texto.
      ariaLabel: etiqueta,

      // El usuario de raton ve este tooltip. Si no se pasa titulo,
      // reutilizamos la etiqueta: dos usuarios, una sola fuente.
      title: titulo ?? etiqueta,

      disabled: deshabilitado,
      onClick
    },
    crearIcono(ICONOS[icono] ?? ICONOS.informacion, 'a-icono a-boton__icono')
  );
}
