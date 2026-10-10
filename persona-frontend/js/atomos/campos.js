/**
 * js/atomos/campos.js
 * ---------------------------------------------------------------------
 * ATOMOS de formulario: entrada de texto, area de texto y seleccion.
 *
 * Son atomos "controlados por atributos": no guardan estado propio ni
 * validan nada. Eso es trabajo de la molecula CampoFormulario y del
 * organismo Formulario.
 *
 * Esta separacion es la que permite reutilizarlos: el mismo
 * EntradaTexto sirve para el nombre de un usuario, la URL de una red
 * social o el buscador de la barra de filtros.
 */

import { crear } from '../utiles/dom.js';

/**
 * Entrada de texto de una linea.
 *
 * @param {object} propiedades
 * @param {string} propiedades.id          Debe coincidir con el `for` de la etiqueta.
 * @param {string} propiedades.nombre      Atributo name, clave en FormData.
 * @param {string} propiedades.tipo        text | date | number | tel | url | email
 * @param {string} propiedades.valor
 * @param {string} propiedades.sugerencia  Placeholder.
 * @param {boolean} propiedades.requerido
 * @param {number} propiedades.maximo      maxlength (caracteres).
 * @param {string} propiedades.maximoValor Atributo max (fechas y numeros).
 * @param {string} propiedades.minimoValor Atributo min (fechas y numeros).
 * @param {string} propiedades.idAyuda     id del texto de ayuda, para aria-describedby.
 * @returns {HTMLInputElement}
 */
export function EntradaTexto({
  id,
  nombre,
  tipo = 'text',
  valor = '',
  sugerencia = '',
  requerido = false,
  maximo = null,
  maximoValor = null,
  minimoValor = null,
  soloLectura = false,
  deshabilitado = false,
  autocompletar = null,
  idAyuda = null,
  onInput = null,
  onBlur = null
} = {}) {
  return crear('input', {
    clase: 'a-campo-texto',
    id,
    name: nombre,
    type: tipo,
    value: valor ?? '',
    placeholder: sugerencia,

    // `required` es un atributo NATIVO: el navegador lo usa para su
    // propia validacion y el lector de pantalla anuncia "obligatorio".
    // No basta con poner un asterisco visual.
    required: requerido,

    // maxlength lo IMPIDE en el teclado; la validacion del servidor
    // lo verifica de nuevo. Defensa en dos capas.
    maxLength: maximo,

    // Para type="date" y type="number", `max` y `min` limitan el
    // rango que acepta el control nativo. En una fecha de nacimiento
    // pasamos max = hoy, para que el calendario no deje elegir el
    // futuro. Es una ayuda visual; el servidor lo valida igual.
    max: maximoValor,
    min: minimoValor,

    readOnly: soloLectura,
    disabled: deshabilitado,

    // autocomplete ayuda al navegador a rellenar el formulario.
    // Mejora mucho la experiencia en movil.
    autocomplete: autocompletar,

    // aria-describedby conecta el campo con su texto de ayuda, para
    // que el lector de pantalla lo lea despues del nombre del campo.
    ariaDescribedby: idAyuda,

    onInput,
    onBlur
  });
}

/**
 * Area de texto de varias lineas.
 */
export function AreaTexto({
  id,
  nombre,
  valor = '',
  sugerencia = '',
  requerido = false,
  filas = 3,
  maximo = null,
  idAyuda = null,
  onInput = null
} = {}) {
  return crear('textarea', {
    clase: 'a-campo-texto a-campo-texto--area',
    id,
    name: nombre,
    value: valor ?? '',
    placeholder: sugerencia,
    required: requerido,
    rows: filas,
    maxLength: maximo,
    ariaDescribedby: idAyuda,
    onInput
  });
}

/**
 * Lista desplegable.
 *
 * @param {object} propiedades
 * @param {Array<{valor: string, texto: string}>} propiedades.opciones
 * @param {string} propiedades.textoVacio  Primera opcion, tipo "Selecciona...".
 * @returns {HTMLSelectElement}
 */
export function Seleccion({
  id,
  nombre,
  valor = '',
  opciones = [],
  textoVacio = null,
  requerido = false,
  deshabilitado = false,
  idAyuda = null,
  onChange = null
} = {}) {
  const hijos = [];

  // La opcion vacia va primero. Su `value` es "" para que la
  // validacion nativa de `required` la considere "sin elegir".
  if (textoVacio !== null) {
    hijos.push(
      crear('option', {
        value: '',
        texto: textoVacio,

        // disabled + selected la muestra pero impide volver a ella,
        // asi el usuario no puede "deseleccionar" por accidente.
        disabled: requerido,
        selected: valor === '' || valor === null || valor === undefined
      })
    );
  }

  for (const opcion of opciones) {
    hijos.push(
      crear('option', {
        value: String(opcion.valor),
        texto: opcion.texto,

        // Comparamos como texto porque el value de un <option>
        // SIEMPRE es texto: 5 (numero) no es igual a "5" (texto).
        selected: String(opcion.valor) === String(valor)
      })
    );
  }

  return crear(
    'select',
    {
      clase: 'a-campo-texto a-campo-texto--seleccion',
      id,
      name: nombre,
      required: requerido,
      disabled: deshabilitado,
      ariaDescribedby: idAyuda,
      onChange
    },
    hijos
  );
}

/**
 * Campo de busqueda con la lupa integrada.
 *
 * type="search" aporta dos cosas gratis:
 *   - el teclado movil muestra la tecla "Buscar";
 *   - algunos navegadores agregan una X para limpiar el campo.
 */
export function EntradaBusqueda({
  id,
  nombre = 'buscar',
  valor = '',
  sugerencia = 'Buscar...',
  etiquetaAccesible = 'Buscar',
  onInput = null
} = {}) {
  return crear('input', {
    clase: 'a-campo-texto a-campo-texto--busqueda',
    id,
    name: nombre,
    type: 'search',
    value: valor,
    placeholder: sugerencia,

    // Este campo no lleva <label> visible (la lupa ya comunica su
    // funcion), por eso necesita aria-label.
    ariaLabel: etiquetaAccesible,

    onInput
  });
}
