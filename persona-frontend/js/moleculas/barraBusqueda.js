/**
 * js/moleculas/barraBusqueda.js
 * ---------------------------------------------------------------------
 * MOLECULA: Barra de busqueda y filtros
 *
 * CONCEPTO CLAVE: EL DEBOUNCE
 * ---------------------------------------------------------------------
 * El evento `input` se dispara con CADA tecla. Si lanzaramos la
 * peticion en cada uno, escribir "hopper" generaria 6 peticiones:
 *
 *   h      -> GET /api/usuarios?buscar=h
 *   ho     -> GET /api/usuarios?buscar=ho
 *   hop    -> GET /api/usuarios?buscar=hop
 *   hopp   -> GET /api/usuarios?buscar=hopp
 *   hoppe  -> GET /api/usuarios?buscar=hoppe
 *   hopper -> GET /api/usuarios?buscar=hopper
 *
 * De esas 6, solo la ultima le interesa al usuario. Las otras 5
 * gastan red, CPU del servidor y consultas a MySQL.
 *
 * Peor aun: las respuestas pueden llegar DESORDENADAS. Si la de "hop"
 * tarda mas que la de "hopper", el usuario termina viendo los
 * resultados de "hop" aunque en el campo diga "hopper". Eso se llama
 * "condicion de carrera" (race condition).
 *
 * El debounce resuelve los dos problemas: espera a que el usuario
 * deje de escribir 400 ms y manda UNA sola peticion.
 */

import { crear, conRetardo } from '../utiles/dom.js';
import { EntradaBusqueda, Seleccion } from '../atomos/campos.js';
import { Boton, BotonIcono } from '../atomos/boton.js';
import { CONFIGURACION } from '../config/configuracion.js';

/**
 * @param {object} propiedades
 * @param {string} propiedades.sugerencia  Placeholder del buscador.
 * @param {Array} propiedades.filtros      [{ id, nombre, etiqueta, opciones, textoVacio }]
 * @param {function} propiedades.onCambio  Recibe un objeto con todos los valores.
 * @returns {{elemento: HTMLElement, obtenerValores: function, limpiar: function}}
 */
export function BarraBusqueda({
  sugerencia = 'Buscar...',
  filtros = [],
  onCambio = null,
  onRecargar = null
} = {}) {
  // Guardamos las referencias de los controles para poder leerlos
  // despues sin hacer querySelector.
  const controles = {};

  /** Recoge el valor de todos los controles en un solo objeto. */
  function obtenerValores() {
    const valores = {};

    for (const [nombre, control] of Object.entries(controles)) {
      const valor = control.value.trim();

      // Solo incluimos los filtros con valor, para no mandar
      // "?ciudad=" vacio a la API.
      if (valor !== '') {
        valores[nombre] = valor;
      }
    }

    return valores;
  }

  /** Avisa al padre que algo cambio. */
  function notificar() {
    if (onCambio !== null) {
      onCambio(obtenerValores());
    }
  }

  // El buscador usa debounce: espera a que el usuario pare de teclear.
  const notificarConRetardo = conRetardo(notificar, CONFIGURACION.retardoBusquedaMs);

  // ---- Campo de busqueda ----
  const campoBusqueda = EntradaBusqueda({
    id: 'barra-buscar',
    nombre: 'buscar',
    sugerencia,
    etiquetaAccesible: sugerencia,
    onInput: notificarConRetardo
  });

  controles.buscar = campoBusqueda;

  // ---- Filtros desplegables ----
  // Estos NO llevan debounce: un cambio en un <select> es una accion
  // deliberada y unica, no una secuencia de pulsaciones. Aplicar el
  // filtro de inmediato se siente mas rapido.
  const elementosFiltros = filtros.map((filtro) => {
    const control = Seleccion({
      id: filtro.id,
      nombre: filtro.nombre,
      opciones: filtro.opciones,
      textoVacio: filtro.textoVacio ?? 'Todos',
      onChange: notificar
    });

    controles[filtro.nombre] = control;

    return crear(
      'div',
      { clase: 'm-barra-busqueda__filtro' },
      // Etiqueta solo para lectores de pantalla: el texto "Todos" del
      // desplegable ya comunica visualmente que es un filtro.
      crear('label', {
        clase: 'solo-lectores',
        htmlFor: filtro.id,
        texto: filtro.etiqueta
      }),
      control
    );
  });

  // ---- Acciones ----
  const acciones = [];

  acciones.push(
    Boton({
      texto: 'Limpiar',
      variante: 'texto',
      icono: 'limpiar',
      onClick: () => {
        limpiar();
        notificar();
      }
    })
  );

  if (onRecargar !== null) {
    acciones.push(
      BotonIcono({
        icono: 'recargar',
        etiqueta: 'Recargar la lista',
        onClick: onRecargar
      })
    );
  }

  /** Vacia todos los controles sin notificar. */
  function limpiar() {
    for (const control of Object.values(controles)) {
      control.value = '';
    }
  }

  const elemento = crear(
    'div',
    {
      clase: 'm-barra-busqueda',

      // role="search" es una "landmark": permite a quien usa lector
      // de pantalla saltar directo a la zona de busqueda.
      role: 'search'
    },
    crear('div', { clase: 'm-barra-busqueda__campo' }, campoBusqueda),
    elementosFiltros.length > 0
      ? crear('div', { clase: 'm-barra-busqueda__filtros' }, elementosFiltros)
      : null,
    crear('div', { clase: 'm-barra-busqueda__acciones' }, acciones)
  );

  return { elemento, obtenerValores, limpiar };
}
