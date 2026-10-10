/**
 * js/atomos/insignia.js
 * ---------------------------------------------------------------------
 * ATOMO: Insignia (chip de estado)
 *
 * Comunica un estado con color Y con texto. El texto no es opcional:
 * una persona con daltonismo no distingue verde de rojo, pero si lee
 * "Activo" o "Inactivo".
 */

import { crear } from '../utiles/dom.js';

/**
 * @param {object} propiedades
 * @param {string} propiedades.texto     Obligatorio: el estado en palabras.
 * @param {string} propiedades.variante  exito | error | advertencia | primaria | terciaria
 * @param {boolean} propiedades.conPunto Agrega el circulo indicador.
 * @param {boolean} propiedades.mono     Fuente monoespaciada (para id).
 */
export function Insignia({
  texto,
  variante = null,
  conPunto = false,
  mono = false,
  titulo = null
} = {}) {
  const clases = [
    'a-insignia',
    variante && `a-insignia--${variante}`,
    mono && 'a-insignia--mono'
  ]
    .filter(Boolean)
    .join(' ');

  const hijos = [];

  if (conPunto) {
    hijos.push(crear('span', { clase: 'a-insignia__punto' }));
  }

  hijos.push(crear('span', { texto }));

  return crear('span', { clase: clases, title: titulo }, hijos);
}

/**
 * Insignia especializada para el estado activo/inactivo.
 *
 * Encapsula la regla "1 es activo, 0 es inactivo" en un solo lugar.
 * Si manana el modelo cambia y usa 'A'/'I', se corrige aqui y toda la
 * aplicacion queda consistente.
 *
 * @param {number} estado  1 o 0
 */
export function InsigniaEstado(estado) {
  const activo = Number(estado) === 1;

  return Insignia({
    texto: activo ? 'Activo' : 'Inactivo',
    variante: activo ? 'exito' : null,
    conPunto: true
  });
}
