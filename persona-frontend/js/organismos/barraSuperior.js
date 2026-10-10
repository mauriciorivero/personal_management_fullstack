/**
 * js/organismos/barraSuperior.js
 * ---------------------------------------------------------------------
 * ORGANISMO: Barra superior de la aplicacion
 *
 * Contiene la marca, el boton del menu (en movil), el indicador de
 * estado de la API y el conmutador de tema claro/oscuro.
 *
 * TEMA CLARO / OSCURO: COMO FUNCIONA DE PUNTA A PUNTA
 * ---------------------------------------------------------------------
 * 1. El CSS define los colores en dos juegos de variables
 *    (01-tokens/_colores.css).
 * 2. El tema del sistema se detecta con
 *    @media (prefers-color-scheme: dark).
 * 3. La eleccion del usuario se guarda en el atributo
 *    data-tema del <html>, que tiene mas peso que el media query.
 * 4. Esa eleccion se persiste en localStorage para que sobreviva al
 *    recargar la pagina.
 *
 * TODA lectura y escritura de localStorage va dentro de try/catch.
 * Por que? Porque en modo incognito, o con las cookies bloqueadas, el
 * simple hecho de LEER localStorage lanza una excepcion. Sin el
 * try/catch, la aplicacion entera deja de arrancar por algo tan
 * secundario como recordar un color.
 */

import { crear, crearIcono } from '../utiles/dom.js';
import { ICONOS } from '../utiles/iconos.js';
import { BotonIcono } from '../atomos/boton.js';
import { CONFIGURACION } from '../config/configuracion.js';

/**
 * Lee el tema guardado. Devuelve null si no hay nada o si
 * localStorage no esta disponible.
 */
function leerTemaGuardado() {
  try {
    return localStorage.getItem(CONFIGURACION.claveTema);
  } catch {
    // Modo incognito o almacenamiento bloqueado: seguimos sin
    // persistencia, pero la aplicacion funciona igual.
    return null;
  }
}

/** Guarda el tema elegido. Falla en silencio si no se puede. */
function guardarTema(tema) {
  try {
    localStorage.setItem(CONFIGURACION.claveTema, tema);
  } catch {
    // No hacemos nada: perder la preferencia no es critico.
  }
}

/**
 * Aplica un tema poniendo el atributo data-tema en el <html>.
 * @param {string} tema  'light' o 'dark'
 */
function aplicarTema(tema) {
  document.documentElement.setAttribute('data-tema', tema);
}

/**
 * Determina el tema con el que arrancar.
 * Prioridad: lo que eligio el usuario > lo que pide el sistema.
 */
function temaInicial() {
  const guardado = leerTemaGuardado();

  if (guardado === 'light' || guardado === 'dark') {
    return guardado;
  }

  // matchMedia permite consultar un media query desde JavaScript.
  const prefiereOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;

  return prefiereOscuro ? 'dark' : 'light';
}

/**
 * @param {object} propiedades
 * @param {function} propiedades.onAbrirMenu  Abre la navegacion lateral en movil.
 * @returns {{elemento: HTMLElement, actualizarEstadoApi: function}}
 */
export function BarraSuperior({ onAbrirMenu = null } = {}) {
  // ---- Tema ----
  let temaActual = temaInicial();
  aplicarTema(temaActual);

  const iconoTema = crearIcono(
    temaActual === 'dark' ? ICONOS.sol : ICONOS.luna,
    'a-icono a-boton__icono'
  );

  const botonTema = crear(
    'button',
    {
      clase: 'a-boton a-boton--icono',
      type: 'button',
      ariaLabel: 'Cambiar entre tema claro y oscuro',
      title: 'Cambiar tema',
      onClick: () => {
        temaActual = temaActual === 'dark' ? 'light' : 'dark';

        aplicarTema(temaActual);
        guardarTema(temaActual);

        // Intercambiamos el icono: en tema oscuro mostramos el sol
        // (lo que vas a activar), no la luna (donde ya estas).
        iconoTema.innerHTML = temaActual === 'dark' ? ICONOS.sol : ICONOS.luna;
      }
    },
    iconoTema
  );

  // ---- Indicador de estado de la API ----
  const puntoEstado = crear('span', {
    clase: 'o-barra-superior__estado-punto'
  });

  const textoEstado = crear('span', { texto: 'Verificando API...' });

  const indicadorEstado = crear(
    'div',
    {
      clase: 'o-barra-superior__estado',

      // aria-live para que el lector anuncie si la API se cae.
      ariaLive: 'polite'
    },
    puntoEstado,
    textoEstado
  );

  // ---- Marca ----
  const marca = crear(
    'div',
    { clase: 'o-barra-superior__marca' },
    crear(
      'div',
      { clase: 'o-barra-superior__logo' },
      crearIcono(ICONOS.usuarios, 'a-icono a-icono--grande')
    ),
    crear(
      'div',
      {},
      crear('h1', {
        clase: 'o-barra-superior__titulo',
        texto: 'Personal Management'
      }),
      crear('p', {
        clase: 'o-barra-superior__subtitulo',
        texto: 'API REST · Node.js + Express + MySQL'
      })
    )
  );

  // ---- Boton del menu (solo visible en movil por CSS) ----
  const botonMenu = BotonIcono({
    icono: 'menu',
    etiqueta: 'Abrir el menu de navegacion',
    onClick: onAbrirMenu
  });

  botonMenu.classList.add('o-barra-superior__menu');

  const elemento = crear(
    'header',
    { clase: 'o-barra-superior o-barra-superior--elevada' },
    botonMenu,
    marca,
    crear('div', { clase: 'o-barra-superior__acciones' }, indicadorEstado, botonTema)
  );

  return {
    elemento,

    /**
     * Actualiza el indicador del estado de la API.
     *
     * Le sirve mucho al aprendiz: si el punto esta rojo, el problema
     * esta en el backend y no vale la pena depurar el frontend.
     *
     * @param {boolean} conectada
     */
    actualizarEstadoApi(conectada) {
      puntoEstado.classList.remove(
        'o-barra-superior__estado-punto--conectado',
        'o-barra-superior__estado-punto--desconectado'
      );

      if (conectada) {
        puntoEstado.classList.add('o-barra-superior__estado-punto--conectado');
        textoEstado.textContent = 'API conectada';
      } else {
        puntoEstado.classList.add('o-barra-superior__estado-punto--desconectado');
        textoEstado.textContent = 'API sin conexion';
      }
    }
  };
}
