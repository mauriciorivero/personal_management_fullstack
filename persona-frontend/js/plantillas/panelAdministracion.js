/**
 * js/plantillas/panelAdministracion.js
 * ---------------------------------------------------------------------
 * PLANTILLA: Panel de administracion
 *
 * ATOMIC DESIGN - NIVEL 4: PLANTILLAS
 * Una plantilla ENSAMBLA organismos y define la estructura de la
 * pagina, pero NO conoce el contenido real.
 *
 * Fijate en lo que esta plantilla NO hace:
 *   - no llama a la API;
 *   - no sabe si la tabla muestra usuarios o redes sociales;
 *   - no valida nada.
 *
 * Solo dice: "la barra arriba, la navegacion a la izquierda y el
 * contenido a la derecha". Quien le pone contenido es la PAGINA.
 *
 * Esa ignorancia deliberada es lo que la hace reutilizable: la misma
 * plantilla sirve para las cuatro secciones de la aplicacion.
 */

import { crear, reemplazarContenido } from '../utiles/dom.js';
import { BarraSuperior } from '../organismos/barraSuperior.js';
import { NavegacionLateral } from '../organismos/navegacionLateral.js';

/**
 * @param {object} propiedades
 * @param {Array} propiedades.secciones  Definicion del menu.
 * @param {string} propiedades.seccionActiva
 * @param {function} propiedades.onNavegar
 * @returns {{elemento, montarEn, establecerContenido, barraSuperior, navegacion}}
 */
export function PanelAdministracion({
  secciones = [],
  seccionActiva = null,
  onNavegar = null
} = {}) {
  // ---- Organismos ----
  const navegacion = NavegacionLateral({
    secciones,
    activa: seccionActiva,
    onNavegar
  });

  const barraSuperior = BarraSuperior({
    // La barra no sabe como se abre el menu: solo avisa. La plantilla
    // conecta el aviso con el metodo de la navegacion.
    onAbrirMenu: () => navegacion.abrir()
  });

  // -------------------------------------------------------------------
  // CLASE DE POSICIONAMIENTO
  // -------------------------------------------------------------------
  // El organismo BarraSuperior define COMO SE VE (.o-barra-superior).
  // La plantilla define DONDE VA (.t-panel-administracion__barra, que
  // lleva el grid-area: barra).
  //
  // Esa separacion es una regla central del Atomic Design: un
  // organismo nunca sabe en que parte de la pagina lo van a poner, asi
  // que la clase de posicionamiento la agrega quien lo coloca.
  //
  // Si se olvida esta linea, el <header> no tiene grid-area y CSS Grid
  // lo auto-coloca en la primera celda libre: se mete en la columna de
  // la navegacion (256px) y el titulo se desborda sobre los botones.
  barraSuperior.elemento.classList.add('t-panel-administracion__barra');

  // ---- Zona de contenido, que cambia con cada seccion ----
  const contenido = crear('main', {
    clase: 't-panel-administracion__contenido',

    // id="contenido-principal" es el destino del enlace
    // "Saltar al contenido".
    id: 'contenido-principal',

    // tabindex="-1" permite enfocarlo por JavaScript tras el salto,
    // sin agregarlo al recorrido normal de la tecla Tab.
    tabIndex: -1
  });

  // ---- Estructura (la cuadricula la define el CSS) ----
  const elemento = crear(
    'div',
    { clase: 't-panel-administracion' },

    // El enlace de salto debe ser el PRIMER elemento enfocable de la
    // pagina, para que aparezca con la primera pulsacion de Tab.
    crear('a', {
      clase: 'salto-contenido',
      href: '#contenido-principal',
      texto: 'Saltar al contenido principal'
    }),

    barraSuperior.elemento,
    crear(
      'div',
      { clase: 't-panel-administracion__navegacion' },
      navegacion.elemento
    ),
    contenido,

    // El velo va al final del DOM para que quede por encima en el
    // apilamiento natural, sin depender solo del z-index.
    navegacion.velo
  );

  return {
    elemento,
    barraSuperior,
    navegacion,

    /** Inserta la plantilla en un contenedor del documento. */
    montarEn(contenedor) {
      reemplazarContenido(contenedor, elemento);
    },

    /**
     * Reemplaza el contenido principal por la vista de una pagina.
     * Es el unico punto por donde entra el contenido dinamico.
     */
    establecerContenido(...nodos) {
      reemplazarContenido(contenido, ...nodos);

      // Volvemos el desplazamiento arriba al cambiar de seccion. Sin
      // esto, al pasar de la pagina 5 de usuarios a redes sociales, la
      // vista aparece a mitad de camino y confunde.
      contenido.scrollTop = 0;
    },

    /** Devuelve el nodo del contenido, para casos puntuales. */
    obtenerContenedorContenido() {
      return contenido;
    }
  };
}

/**
 * Cabecera de pagina: titulo, descripcion y accion principal.
 *
 * La ponemos aqui, en el nivel de plantilla, porque es un patron de
 * ESTRUCTURA que las cuatro paginas repiten igual.
 *
 * @param {object} propiedades
 * @param {string} propiedades.titulo
 * @param {string} propiedades.descripcion
 * @param {HTMLElement} propiedades.accion
 */
export function CabeceraPagina({ titulo, descripcion = null, accion = null } = {}) {
  return crear(
    'div',
    { clase: 't-panel-administracion__cabecera' },
    crear(
      'div',
      {},
      // Es un h2 porque el h1 de la pagina es el titulo de la
      // aplicacion, en la barra superior. Los encabezados tienen que
      // formar una jerarquia sin saltos: h1 -> h2 -> h3.
      crear('h2', { clase: 't-panel-administracion__titulo', texto: titulo }),
      descripcion
        ? crear('p', {
            clase: 't-panel-administracion__descripcion',
            texto: descripcion
          })
        : null
    ),
    accion
  );
}
