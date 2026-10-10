/**
 * js/moleculas/notificacion.js
 * ---------------------------------------------------------------------
 * MOLECULA: Sistema de notificaciones (snackbar / toast)
 *
 * PATRON SINGLETON APLICADO A UN COMPONENTE DE INTERFAZ
 * ---------------------------------------------------------------------
 * Solo puede existir UN contenedor de notificaciones en la pagina. Si
 * cada vista creara el suyo, las notificaciones se apilarian en
 * lugares distintos y se taparian entre si.
 *
 * Por eso exportamos una INSTANCIA, igual que config/database.js en el
 * backend. Es el mismo patron resolviendo el mismo tipo de problema:
 * un recurso compartido con un unico punto de acceso.
 *
 * Uso desde cualquier parte de la aplicacion:
 *
 *   import { notificador } from '../moleculas/notificacion.js';
 *   notificador.exito('Usuario creado correctamente.');
 *   notificador.desdeErrorApi(error);
 */

import { crear, crearIcono } from '../utiles/dom.js';
import { ICONOS } from '../utiles/iconos.js';
import { BotonIcono } from '../atomos/boton.js';
import { CONFIGURACION } from '../config/configuracion.js';

class Notificador {
  #contenedor;

  constructor() {
    this.#contenedor = null;
  }

  /**
   * Crea el contenedor la primera vez que se necesita
   * (inicializacion perezosa, igual que el pool de MySQL).
   */
  #obtenerContenedor() {
    if (this.#contenedor !== null) {
      return this.#contenedor;
    }

    this.#contenedor = crear('div', {
      clase: 'm-notificacion-contenedor',

      // aria-live="polite": el lector de pantalla anuncia los
      // mensajes nuevos, pero espera a que termine lo que estaba
      // leyendo. Con "assertive" interrumpiria al usuario, lo que
      // solo se justifica en una emergencia.
      ariaLive: 'polite',
      role: 'status'
    });

    document.body.appendChild(this.#contenedor);

    return this.#contenedor;
  }

  /**
   * Muestra una notificacion.
   *
   * @param {object} opciones
   * @param {string} opciones.mensaje
   * @param {string} opciones.titulo
   * @param {string} opciones.variante  exito | error | advertencia | null
   * @param {string[]} opciones.detalles  Lista de errores de campo.
   * @param {number} opciones.duracion   Milisegundos. 0 = no se cierra sola.
   */
  mostrar({ mensaje, titulo = null, variante = null, detalles = [], duracion = null } = {}) {
    const contenedor = this.#obtenerContenedor();

    // Elegimos el icono segun la variante.
    const iconoPorVariante = {
      exito: ICONOS.exito,
      error: ICONOS.error,
      advertencia: ICONOS.advertencia
    };

    const trazadoIcono = iconoPorVariante[variante] ?? ICONOS.informacion;

    // ---- Contenido ----
    const hijosContenido = [];

    if (titulo !== null) {
      hijosContenido.push(
        crear('p', { clase: 'm-notificacion__titulo', texto: titulo })
      );
    }

    hijosContenido.push(
      crear('p', { clase: 'm-notificacion__mensaje', texto: mensaje })
    );

    // Lista de detalles: los campos invalidos que devolvio la API.
    if (Array.isArray(detalles) && detalles.length > 0) {
      hijosContenido.push(
        crear(
          'ul',
          { clase: 'm-notificacion__detalles' },
          detalles.map((detalle) =>
            crear('li', {
              // El detalle puede venir como objeto {campo, mensaje}
              // o como texto simple. Soportamos los dos casos.
              texto:
                typeof detalle === 'string'
                  ? detalle
                  : `${detalle.campo}: ${detalle.mensaje}`
            })
          )
        )
      );
    }

    // ---- La notificacion ----
    const elemento = crear(
      'div',
      {
        clase: `m-notificacion${variante ? ` m-notificacion--${variante}` : ''}`
      },
      crearIcono(trazadoIcono, 'a-icono m-notificacion__icono'),
      crear('div', { clase: 'm-notificacion__contenido' }, hijosContenido),
      BotonIcono({
        icono: 'cerrar',
        etiqueta: 'Cerrar notificacion',
        pequeno: true,
        onClick: () => this.#cerrar(elemento)
      })
    );

    contenedor.appendChild(elemento);

    // ---- Cierre automatico ----
    // Los errores duran mas, porque el usuario necesita leerlos. Si
    // la duracion es 0, no se cierra sola: se queda hasta que el
    // usuario la cierre a mano.
    const duracionFinal =
      duracion ??
      (variante === 'error'
        ? CONFIGURACION.duracionNotificacionMs * 2
        : CONFIGURACION.duracionNotificacionMs);

    if (duracionFinal > 0) {
      setTimeout(() => this.#cerrar(elemento), duracionFinal);
    }

    return elemento;
  }

  /**
   * Cierra una notificacion con animacion de salida.
   *
   * No la quitamos de golpe: le ponemos la clase de salida, esperamos
   * a que termine la animacion y recien entonces la eliminamos del
   * DOM. Si la borraramos de inmediato, desapareceria de un salto.
   */
  #cerrar(elemento) {
    // Si ya se esta cerrando (doble clic en la X), no hacemos nada.
    if (!elemento.isConnected || elemento.classList.contains('m-notificacion--saliendo')) {
      return;
    }

    elemento.classList.add('m-notificacion--saliendo');

    // El evento animationend avisa cuando la animacion CSS termina.
    // { once: true } hace que el oyente se quite solo despues de
    // dispararse: evita fugas de memoria.
    elemento.addEventListener(
      'animationend',
      () => elemento.remove(),
      { once: true }
    );
  }

  // ---------------- Atajos por tipo ----------------

  exito(mensaje, titulo = 'Listo') {
    return this.mostrar({ mensaje, titulo, variante: 'exito' });
  }

  error(mensaje, detalles = [], titulo = 'Ocurrio un error') {
    return this.mostrar({ mensaje, titulo, variante: 'error', detalles });
  }

  advertencia(mensaje, titulo = 'Atencion') {
    return this.mostrar({ mensaje, titulo, variante: 'advertencia' });
  }

  informacion(mensaje, titulo = null) {
    return this.mostrar({ mensaje, titulo });
  }

  /**
   * Traduce un ErrorApi a una notificacion adecuada.
   *
   * Centralizar esta traduccion evita repetir el mismo bloque de
   * if/else en cada pagina. Cada tipo de error merece un mensaje y un
   * tono distinto:
   *
   *   sin conexion -> el problema es el servidor, no el usuario
   *   validacion   -> el usuario debe corregir datos
   *   no encontrado-> el recurso ya no existe (quizas otro lo borro)
   *   conflicto    -> choca con una regla de negocio
   *
   * @param {import('../servicios/clienteApi.js').ErrorApi} error
   */
  desdeErrorApi(error) {
    if (error.esSinConexion) {
      return this.mostrar({
        mensaje: error.message,
        titulo: 'Sin conexion con la API',
        variante: 'error',

        // duracion 0: este error no se cierra solo. El usuario tiene
        // que verlo y actuar (encender el servidor).
        duracion: 0
      });
    }

    if (error.esValidacion) {
      return this.mostrar({
        mensaje: error.message,
        titulo: 'Datos invalidos',
        variante: 'advertencia',
        detalles: error.detalles
      });
    }

    if (error.esNoEncontrado) {
      return this.mostrar({
        mensaje: error.message,
        titulo: 'No encontrado',
        variante: 'advertencia'
      });
    }

    if (error.esConflicto) {
      return this.mostrar({
        mensaje: error.message,
        titulo: 'Operacion no permitida',
        variante: 'advertencia'
      });
    }

    // Cualquier otro caso: error del servidor.
    return this.error(error.message, error.detalles);
  }
}

export const notificador = new Notificador();
