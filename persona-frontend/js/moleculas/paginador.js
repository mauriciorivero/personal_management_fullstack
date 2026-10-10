/**
 * js/moleculas/paginador.js
 * ---------------------------------------------------------------------
 * MOLECULA: Paginador
 *
 * Consume el objeto `meta` que construye utils/respuesta.js del
 * backend:
 *
 *   "meta": {
 *     "total": 42, "pagina": 2, "limite": 10, "devueltos": 10,
 *     "totalPaginas": 5, "hayPaginaSiguiente": true,
 *     "hayPaginaAnterior": true
 *   }
 *
 * POR QUE EL SERVIDOR CALCULA totalPaginas Y LAS BANDERAS?
 * Porque la paginacion es una regla de negocio, no de presentacion.
 * Si el frontend hiciera Math.ceil(total / limite) por su cuenta y el
 * dia de maniana la API cambiara el tope maximo de registros, habria
 * dos verdades distintas en el sistema. El servidor es la unica
 * fuente de verdad; el frontend solo pinta lo que recibe.
 */

import { crear } from '../utiles/dom.js';
import { BotonIcono } from '../atomos/boton.js';
import { Seleccion } from '../atomos/campos.js';
import { numero } from '../utiles/formato.js';
import { CONFIGURACION } from '../config/configuracion.js';

/**
 * @param {object} propiedades
 * @param {object} propiedades.meta          El objeto meta de la API.
 * @param {function} propiedades.onCambiarPagina  Recibe el numero de pagina.
 * @param {function} propiedades.onCambiarLimite  Recibe los registros por pagina.
 * @returns {HTMLElement}
 */
export function Paginador({ meta, onCambiarPagina = null, onCambiarLimite = null } = {}) {
  // Si no hay meta (una lista sin paginar), no renderizamos nada.
  // Devolver un fragmento vacio evita tener que poner condicionales
  // en quien use esta molecula.
  if (!meta) {
    return document.createDocumentFragment();
  }

  const { total, pagina, limite, devueltos, totalPaginas, hayPaginaSiguiente, hayPaginaAnterior } =
    meta;

  // Rango de registros visibles: "Mostrando 11-20 de 42".
  const desde = total === 0 ? 0 : (pagina - 1) * limite + 1;
  const hasta = total === 0 ? 0 : desde + devueltos - 1;

  // ---- Texto informativo ----
  const info = crear(
    'p',
    { clase: 'm-paginador__info' },
    'Mostrando ',
    crear('strong', { texto: `${numero(desde)}-${numero(hasta)}` }),
    ' de ',
    crear('strong', { texto: numero(total) }),
    total === 1 ? ' registro' : ' registros'
  );

  // ---- Selector de registros por pagina ----
  const selectorLimite = crear(
    'div',
    { clase: 'm-paginador__limite' },
    crear('label', {
      clase: 'solo-lectores',
      htmlFor: 'paginador-limite',
      texto: 'Registros por pagina'
    }),
    Seleccion({
      id: 'paginador-limite',
      nombre: 'limite',
      valor: String(limite),
      opciones: CONFIGURACION.opcionesLimite.map((opcion) => ({
        valor: opcion,
        texto: String(opcion)
      })),
      onChange: (evento) => {
        if (onCambiarLimite !== null) {
          onCambiarLimite(Number(evento.target.value));
        }
      }
    }),
    crear('span', { texto: 'por pagina' })
  );

  // ---- Controles de navegacion ----
  const controles = crear(
    'div',
    { clase: 'm-paginador__controles' },

    BotonIcono({
      icono: 'flechaIzquierda',
      etiqueta: 'Pagina anterior',

      // Deshabilitamos con el atributo disabled, no escondiendo el
      // boton. Si desapareciera, los demas controles se moverian de
      // sitio y el usuario perderia la referencia visual.
      deshabilitado: !hayPaginaAnterior,

      onClick: () => {
        if (onCambiarPagina !== null && hayPaginaAnterior) {
          onCambiarPagina(pagina - 1);
        }
      }
    }),

    crear('span', {
      clase: 'm-paginador__pagina',

      // aria-live hace que el lector de pantalla anuncie el cambio de
      // pagina. Sin esto, quien no ve la pantalla no se entera de que
      // la lista se actualizo.
      ariaLive: 'polite',

      texto: `${pagina} de ${Math.max(1, totalPaginas)}`
    }),

    BotonIcono({
      icono: 'flechaDerecha',
      etiqueta: 'Pagina siguiente',
      deshabilitado: !hayPaginaSiguiente,
      onClick: () => {
        if (onCambiarPagina !== null && hayPaginaSiguiente) {
          onCambiarPagina(pagina + 1);
        }
      }
    })
  );

  return crear(
    'nav',
    {
      clase: 'm-paginador',

      // aria-label distingue este <nav> del de la navegacion lateral.
      // Una pagina puede tener varios <nav>, pero cada uno necesita su
      // propia etiqueta para que el lector los diferencie.
      ariaLabel: 'Paginacion de resultados'
    },
    info,
    selectorLimite,
    controles
  );
}
