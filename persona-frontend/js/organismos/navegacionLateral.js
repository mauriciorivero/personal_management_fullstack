/**
 * js/organismos/navegacionLateral.js
 * ---------------------------------------------------------------------
 * ORGANISMO: Navegacion lateral
 *
 * Un mismo HTML con dos comportamientos segun el ancho:
 *   movil      -> panel que entra deslizando sobre un velo oscuro
 *   escritorio -> columna fija de la cuadricula
 *
 * Toda la diferencia la hace el CSS (_o-navegacion-lateral.css); el
 * JavaScript solo abre, cierra y marca el enlace activo.
 *
 * ACCESIBILIDAD AL ABRIR EN MOVIL: tres cosas obligatorias
 *   1. Mover el foco DENTRO del panel al abrir.
 *   2. Cerrar con la tecla Escape.
 *   3. Devolver el foco al boton que lo abrio al cerrar.
 * Sin eso, quien navega con teclado "se pierde": el foco se queda
 * detras del panel, en un contenido que no puede ver.
 */

import { crear, crearIcono, buscarTodos } from '../utiles/dom.js';
import { ICONOS } from '../utiles/iconos.js';
import { BotonIcono } from '../atomos/boton.js';
import { CONFIGURACION } from '../config/configuracion.js';

/**
 * @param {object} propiedades
 * @param {Array} propiedades.secciones  [{ grupo, elementos: [{ id, etiqueta, icono }] }]
 * @param {string} propiedades.activa    id de la seccion activa.
 * @param {function} propiedades.onNavegar  Recibe el id de la seccion.
 * @returns {{elemento, velo, abrir, cerrar, marcarActiva, actualizarContador}}
 */
export function NavegacionLateral({ secciones = [], activa = null, onNavegar = null } = {}) {
  // Guardamos el elemento que tenia el foco antes de abrir, para
  // devolverselo al cerrar.
  let elementoConFocoPrevio = null;

  // Mapa id -> elemento del contador, para actualizarlos sin
  // re-renderizar toda la navegacion.
  const contadores = {};

  const velo = crear('div', {
    clase: 'o-navegacion-velo',

    // El velo no es un boton, pero se puede hacer clic en el para
    // cerrar. Por eso NO lleva rol: es una conveniencia de raton. El
    // usuario de teclado cierra con Escape, que es lo esperado.
    onClick: () => cerrar()
  });

  // ---- Construccion de la lista de enlaces ----
  const hijosLista = [];

  for (const seccion of secciones) {
    if (seccion.grupo) {
      hijosLista.push(
        crear('li', { clase: 'o-navegacion-lateral__grupo', texto: seccion.grupo })
      );
    }

    for (const elementoSeccion of seccion.elementos) {
      const contador = crear('span', {
        clase: 'o-navegacion-lateral__contador',
        texto: '—'
      });

      contadores[elementoSeccion.id] = contador;

      const enlace = crear(
        'button',
        {
          clase: 'o-navegacion-lateral__enlace',
          type: 'button',

          // data-seccion nos permite encontrar el enlace despues sin
          // guardar referencias en otro mapa.
          dataSeccion: elementoSeccion.id,

          onClick: () => {
            if (onNavegar !== null) {
              onNavegar(elementoSeccion.id);
            }
            // En movil cerramos el panel tras elegir, para que el
            // usuario vea el contenido de inmediato.
            cerrar();
          }
        },
        crearIcono(
          ICONOS[elementoSeccion.icono] ?? ICONOS.informacion,
          'a-icono o-navegacion-lateral__enlace-icono'
        ),
        crear('span', { texto: elementoSeccion.etiqueta }),
        contador
      );

      hijosLista.push(crear('li', {}, enlace));
    }
  }

  const botonCerrar = BotonIcono({
    icono: 'cerrar',
    etiqueta: 'Cerrar el menu de navegacion',
    onClick: () => cerrar()
  });

  botonCerrar.classList.add('o-navegacion-lateral__cerrar');

  const elemento = crear(
    'nav',
    {
      clase: 'o-navegacion-lateral',

      // aria-label diferencia este <nav> del paginador.
      ariaLabel: 'Navegacion principal'
    },
    crear(
      'div',
      { clase: 'o-navegacion-lateral__cabecera' },
      crear('p', { clase: 'o-navegacion-lateral__titulo', texto: 'Recursos' }),
      botonCerrar
    ),
    crear('ul', { clase: 'o-navegacion-lateral__lista' }, hijosLista),
    crear(
      'div',
      { clase: 'o-navegacion-lateral__pie' },
      crear('p', { texto: 'API conectada a:' }),
      crear('code', { texto: CONFIGURACION.urlApi })
    )
  );

  /**
   * Manejador de la tecla Escape. Lo guardamos en una variable para
   * poder QUITARLO al cerrar.
   *
   * Si no lo quitaramos, cada apertura agregaria un oyente nuevo y
   * tras 10 aperturas habria 10 oyentes haciendo el mismo trabajo.
   * Eso es una fuga de memoria (memory leak).
   */
  function manejarTeclado(evento) {
    if (evento.key === 'Escape') {
      cerrar();
    }
  }

  /** Abre el panel (solo tiene efecto visible en movil). */
  function abrir() {
    elementoConFocoPrevio = document.activeElement;

    elemento.classList.add('o-navegacion-lateral--abierta');
    velo.classList.add('o-navegacion-velo--visible');

    // En movil el panel se comporta como un dialogo.
    elemento.setAttribute('role', 'dialog');
    elemento.setAttribute('aria-modal', 'true');

    document.addEventListener('keydown', manejarTeclado);

    // Movemos el foco al primer elemento enfocable del panel.
    const primerEnfocable = elemento.querySelector('button');
    if (primerEnfocable) {
      primerEnfocable.focus();
    }
  }

  /** Cierra el panel. */
  function cerrar() {
    elemento.classList.remove('o-navegacion-lateral--abierta');
    velo.classList.remove('o-navegacion-velo--visible');

    elemento.removeAttribute('role');
    elemento.removeAttribute('aria-modal');

    document.removeEventListener('keydown', manejarTeclado);

    // Devolvemos el foco a donde estaba.
    if (elementoConFocoPrevio && typeof elementoConFocoPrevio.focus === 'function') {
      elementoConFocoPrevio.focus();
      elementoConFocoPrevio = null;
    }
  }

  /**
   * Marca el enlace activo con aria-current="page".
   *
   * Ese atributo hace dos cosas de una sola vez: el lector de
   * pantalla anuncia "pagina actual" y el CSS lo usa de selector para
   * pintar la pildora de fondo.
   */
  function marcarActiva(idSeccion) {
    for (const enlace of buscarTodos('[data-seccion]', elemento)) {
      if (enlace.dataset.seccion === idSeccion) {
        enlace.setAttribute('aria-current', 'page');
      } else {
        enlace.removeAttribute('aria-current');
      }
    }
  }

  if (activa !== null) {
    marcarActiva(activa);
  }

  return {
    elemento,
    velo,
    abrir,
    cerrar,
    marcarActiva,

    /**
     * Actualiza el contador de registros de una seccion.
     * @param {string} idSeccion
     * @param {number} total
     */
    actualizarContador(idSeccion, total) {
      const contador = contadores[idSeccion];

      if (contador) {
        contador.textContent = String(total);
      }
    }
  };
}
