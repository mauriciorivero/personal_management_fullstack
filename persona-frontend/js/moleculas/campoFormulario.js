/**
 * js/moleculas/campoFormulario.js
 * ---------------------------------------------------------------------
 * MOLECULA: Campo de formulario completo
 *
 * Combina tres atomos para formar una unidad funcional:
 *   etiqueta + control + mensaje de error (y texto de ayuda opcional)
 *
 * DEVUELVE UN OBJETO, NO SOLO UN ELEMENTO
 * ---------------------------------------------------------------------
 * Las moleculas con estado devuelven un objeto con el elemento y los
 * metodos para manipularlo:
 *
 *   const campo = CampoFormulario({ ... });
 *   formulario.appendChild(campo.elemento);
 *   campo.mostrarError('El nombre es obligatorio');
 *   const valor = campo.obtenerValor();
 *
 * Por que? Porque si solo devolvieramos el <div>, quien lo use tendria
 * que buscar el input por dentro con querySelector y conocer su
 * estructura interna. Eso rompe el encapsulamiento: el dia que
 * cambiemos el HTML de la molecula, se romperian todos sus usos.
 *
 * Con el objeto, la estructura interna queda escondida detras de una
 * interfaz estable. Es el MISMO principio de los getters y setters de
 * las clases del backend, aplicado a un componente de interfaz.
 */

import { crear, crearIcono } from '../utiles/dom.js';
import { ICONOS } from '../utiles/iconos.js';
import { EntradaTexto, AreaTexto, Seleccion } from '../atomos/campos.js';

/**
 * @param {object} propiedades
 * @param {string} propiedades.id          id unico del control.
 * @param {string} propiedades.nombre      Atributo name.
 * @param {string} propiedades.etiqueta    Texto visible de la etiqueta.
 * @param {string} propiedades.control     texto | area | seleccion
 * @param {string} propiedades.ayuda       Texto de ayuda permanente.
 * @param {boolean} propiedades.anchoCompleto  Ocupa las dos columnas.
 * @returns {{elemento: HTMLElement, obtenerValor: function, establecerValor: function,
 *            mostrarError: function, limpiarError: function, enfocar: function,
 *            control: HTMLElement}}
 */
export function CampoFormulario({
  id,
  nombre,
  etiqueta,
  control = 'texto',
  tipo = 'text',
  valor = '',
  sugerencia = '',
  requerido = false,
  maximo = null,
  maximoValor = null,
  opciones = [],
  textoVacio = null,
  ayuda = null,
  anchoCompleto = false,
  deshabilitado = false,
  autocompletar = null,
  onInput = null,
  onChange = null
} = {}) {
  // id derivados, para conectar el control con sus textos por ARIA.
  const idAyuda = ayuda ? `${id}-ayuda` : null;
  const idError = `${id}-error`;

  // ---- Atomo 1: la etiqueta ----
  const elementoEtiqueta = crear('label', {
    clase: `a-etiqueta${requerido ? ' a-etiqueta--obligatoria' : ''}`,

    // htmlFor genera el atributo `for`. Se llama asi porque `for` es
    // una palabra reservada de JavaScript y no se puede usar como
    // nombre de propiedad.
    htmlFor: id,

    texto: etiqueta
  });

  // ---- Atomo 2: el control ----
  let elementoControl;

  const propiedadesComunes = {
    id,
    nombre,
    valor,
    sugerencia,
    requerido,
    maximo,
    deshabilitado,
    idAyuda
  };

  if (control === 'area') {
    elementoControl = AreaTexto({ ...propiedadesComunes, onInput });
  } else if (control === 'seleccion') {
    elementoControl = Seleccion({
      ...propiedadesComunes,
      opciones,
      textoVacio,
      onChange
    });
  } else {
    elementoControl = EntradaTexto({
      ...propiedadesComunes,
      tipo,
      maximoValor,
      autocompletar,
      onInput
    });
  }

  // ---- Parte propia: texto de ayuda ----
  const elementoAyuda = ayuda
    ? crear('p', {
        clase: 'm-campo-formulario__ayuda',
        id: idAyuda,
        texto: ayuda
      })
    : null;

  // ---- Parte propia: mensaje de error ----
  const textoError = crear('span', {});

  const elementoError = crear(
    'p',
    {
      clase: 'm-campo-formulario__error',
      id: idError,

      // role="alert" hace que el lector de pantalla lo anuncie en
      // cuanto se vuelve visible, sin esperar a que el usuario
      // navegue hasta el.
      role: 'alert'
    },
    crearIcono(ICONOS.error, 'a-icono m-campo-formulario__error-icono'),
    textoError
  );

  // ---- Ensamblado de la molecula ----
  const elemento = crear(
    'div',
    {
      clase: `m-campo-formulario${anchoCompleto ? ' m-campo-formulario--ancho-completo' : ''}`
    },
    elementoEtiqueta,
    elementoControl,
    elementoAyuda,
    elementoError
  );

  // =====================================================================
  // INTERFAZ PUBLICA de la molecula
  // =====================================================================
  return {
    /** El nodo del DOM, para insertarlo en el formulario. */
    elemento,

    /** El control interno. Se expone para casos puntuales (enfocar,
     *  escuchar un evento propio), pero se prefieren los metodos. */
    control: elementoControl,

    /** Valor actual, ya con los espacios recortados. */
    obtenerValor() {
      return elementoControl.value.trim();
    },

    /** Asigna un valor al control. */
    establecerValor(nuevoValor) {
      elementoControl.value = nuevoValor ?? '';
    },

    /**
     * Muestra un mensaje de error.
     *
     * Hace TRES cosas, y las tres importan:
     *   1. Escribe el texto del mensaje.
     *   2. Muestra el bloque de error (modificador --visible).
     *   3. Marca el control con aria-invalid="true", que a la vez
     *      informa al lector de pantalla y activa el borde rojo del CSS.
     */
    mostrarError(mensaje) {
      textoError.textContent = mensaje;
      elementoError.classList.add('m-campo-formulario__error--visible');
      elementoControl.setAttribute('aria-invalid', 'true');

      // Al marcar el error, conectamos el control con el mensaje para
      // que el lector de pantalla lo lea como parte del campo.
      const descripciones = [idAyuda, idError].filter(Boolean).join(' ');
      elementoControl.setAttribute('aria-describedby', descripciones);
    },

    /** Quita el estado de error. */
    limpiarError() {
      textoError.textContent = '';
      elementoError.classList.remove('m-campo-formulario__error--visible');

      // removeAttribute, no setAttribute('aria-invalid', 'false'):
      // ausente es mas limpio y evita confundir al lector de pantalla.
      elementoControl.removeAttribute('aria-invalid');

      if (idAyuda) {
        elementoControl.setAttribute('aria-describedby', idAyuda);
      } else {
        elementoControl.removeAttribute('aria-describedby');
      }
    },

    /** Pone el foco en el control. Se usa para llevar al usuario al
     *  primer campo con error. */
    enfocar() {
      elementoControl.focus();
    },

    /** Nombre del campo, para emparejarlo con los errores del servidor. */
    nombre
  };
}
