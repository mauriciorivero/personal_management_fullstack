/**
 * js/main.js
 * ---------------------------------------------------------------------
 * PUNTO DE ENTRADA del frontend.
 *
 * Es el equivalente de index.js en el backend: no contiene logica de
 * negocio, solo ORQUESTA el arranque de la aplicacion.
 *
 *   1. Crea la plantilla (la estructura de la pagina).
 *   2. Registra las paginas disponibles.
 *   3. Verifica que la API responda.
 *   4. Muestra la primera seccion.
 *   5. Atiende la navegacion.
 *
 * ENRUTAMIENTO CON EL HASH DE LA URL
 * ---------------------------------------------------------------------
 * Usamos el fragmento de la URL (lo que va despues de #) para saber
 * que seccion mostrar:
 *
 *   index.html#usuarios
 *   index.html#telefonos
 *
 * Por que el hash y no rutas normales como /usuarios?
 * Porque cambiar el hash NO recarga la pagina y no necesita ninguna
 * configuracion del servidor. Con rutas reales, al recargar
 * /usuarios el servidor estatico buscaria un archivo llamado
 * "usuarios" y devolveria 404. El hash es la forma mas simple de
 * tener enlaces compartibles y que el boton Atras funcione, sin
 * backend de por medio.
 */

import { buscar } from './utiles/dom.js';
import { PanelAdministracion } from './plantillas/panelAdministracion.js';
import { notificador } from './moleculas/notificacion.js';
import { clienteApi } from './servicios/clienteApi.js';

import { PaginaUsuarios } from './paginas/paginaUsuarios.js';
import { PaginaTelefonos } from './paginas/paginaTelefonos.js';
import { PaginaRedesSociales } from './paginas/paginaRedesSociales.js';
import { PaginaPerfilesSociales } from './paginas/paginaPerfilesSociales.js';

import { CONFIGURACION } from './config/configuracion.js';

// ---------------------------------------------------------------------
// Definicion del menu de navegacion
// ---------------------------------------------------------------------
const SECCIONES = [
  {
    grupo: 'Gestion',
    elementos: [
      { id: 'usuarios', etiqueta: 'Usuarios', icono: 'usuarios' },
      { id: 'telefonos', etiqueta: 'Telefonos', icono: 'telefono' }
    ]
  },
  {
    grupo: 'Catalogos y relaciones',
    elementos: [
      { id: 'redes-sociales', etiqueta: 'Redes sociales', icono: 'redSocial' },
      { id: 'perfiles-sociales', etiqueta: 'Perfiles sociales', icono: 'perfilSocial' }
    ]
  }
];

/** Seccion que se muestra si el hash esta vacio o no se reconoce. */
const SECCION_POR_DEFECTO = 'usuarios';

/**
 * Arranca la aplicacion.
 */
function iniciar() {
  const raiz = buscar('#aplicacion');

  if (raiz === null) {
    // Si falta el contenedor, el HTML esta mal: avisamos en consola
    // porque todavia no hay interfaz donde mostrar el error.
    console.error('[main.js] No se encontro el elemento #aplicacion en el HTML.');
    return;
  }

  // ---- 1. Plantilla ----
  const panel = PanelAdministracion({
    secciones: SECCIONES,
    seccionActiva: SECCION_POR_DEFECTO,

    // Al pulsar un enlace del menu solo cambiamos el hash. El oyente
    // de 'hashchange' se encarga del resto.
    //
    // Por que asi y no navegando directo? Porque de este modo hay UN
    // solo camino para cambiar de seccion: el hash. Da igual si el
    // usuario pulso el menu, escribio la URL o uso el boton Atras del
    // navegador: el comportamiento es siempre el mismo.
    onNavegar: (idSeccion) => {
      window.location.hash = idSeccion;
    }
  });

  panel.montarEn(raiz);

  /** Envia el contenido de una pagina a la zona principal. */
  const mostrarContenido = (...nodos) => panel.establecerContenido(...nodos);

  // ---- 2. Paginas ----
  // Cada pagina recibe la funcion para pintar y la funcion para
  // actualizar su contador en el menu. No conocen la plantilla ni
  // entre si: solo reciben dos funciones.
  const paginas = {
    usuarios: PaginaUsuarios({
      onContenido: mostrarContenido,
      onTotalCambiado: (total) => panel.navegacion.actualizarContador('usuarios', total)
    }),
    telefonos: PaginaTelefonos({
      onContenido: mostrarContenido,
      onTotalCambiado: (total) => panel.navegacion.actualizarContador('telefonos', total)
    }),
    'redes-sociales': PaginaRedesSociales({
      onContenido: mostrarContenido,
      onTotalCambiado: (total) =>
        panel.navegacion.actualizarContador('redes-sociales', total)
    }),
    'perfiles-sociales': PaginaPerfilesSociales({
      onContenido: mostrarContenido,
      onTotalCambiado: (total) =>
        panel.navegacion.actualizarContador('perfiles-sociales', total)
    })
  };

  /**
   * Lee el hash de la URL y devuelve el id de la seccion.
   * slice(1) quita el caracter '#'.
   */
  function seccionDesdeHash() {
    const hash = window.location.hash.slice(1);

    // Si el hash no corresponde a ninguna pagina conocida, caemos en
    // la seccion por defecto. Asi un enlace viejo o mal escrito no
    // deja la pantalla en blanco.
    return Object.hasOwn(paginas, hash) ? hash : SECCION_POR_DEFECTO;
  }

  /** Muestra la seccion indicada por el hash. */
  async function navegar() {
    const idSeccion = seccionDesdeHash();

    panel.navegacion.marcarActiva(idSeccion);

    // Actualizamos el titulo de la pestania del navegador. Es un
    // detalle pequeno que ayuda cuando el usuario tiene varias
    // pestanias abiertas.
    const etiqueta = SECCIONES.flatMap((seccion) => seccion.elementos).find(
      (elemento) => elemento.id === idSeccion
    )?.etiqueta;

    document.title = `${etiqueta ?? 'Inicio'} · Personal Management`;

    await paginas[idSeccion].cargar();
  }

  // ---- 3. Oyente de navegacion ----
  // El evento 'hashchange' se dispara al cambiar el hash, venga del
  // menu, de la barra de direcciones o del boton Atras.
  window.addEventListener('hashchange', navegar);

  // ---- 4. Verificacion de la API ----
  // Lo hacemos en paralelo a la primera carga: no bloqueamos la
  // interfaz esperando el resultado del chequeo de salud.
  verificarApi(panel);

  // ---- 5. Primera carga ----
  navegar();
}

/**
 * Comprueba si la API responde y actualiza el indicador de la barra.
 *
 * Esta funcion es muy util para el aprendiz: si el punto esta rojo,
 * el problema es el backend y no vale la pena depurar el frontend.
 */
async function verificarApi(panel) {
  const disponible = await clienteApi.verificarSalud();

  panel.barraSuperior.actualizarEstadoApi(disponible);

  if (!disponible) {
    notificador.mostrar({
      titulo: 'La API no responde',
      mensaje:
        `No se pudo contactar con ${CONFIGURACION.urlApi}. ` +
        'Verifica que MySQL este encendido y que hayas ejecutado "npm start" ' +
        'en la carpeta persona-api.',
      variante: 'error',

      // duracion 0: este aviso no se cierra solo. El usuario tiene
      // que verlo y actuar.
      duracion: 0
    });
  }

  // Revisamos cada 30 segundos, para detectar si la API se cae
  // mientras el usuario trabaja.
  setTimeout(() => verificarApi(panel), 30_000);
}

/**
 * ARRANQUE
 * ---------------------------------------------------------------------
 * Con <script type="module">, el navegador aplica `defer` de forma
 * automatica: el modulo se ejecuta cuando el HTML ya esta parseado.
 *
 * Aun asi comprobamos document.readyState, porque es un habito que
 * evita el error mas comun del JavaScript de navegador: intentar
 * manipular un elemento que todavia no existe en el DOM.
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
