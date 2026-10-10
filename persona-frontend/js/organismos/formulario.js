/**
 * js/organismos/formulario.js
 * ---------------------------------------------------------------------
 * ORGANISMO: Formulario generico
 *
 * Igual que la tabla, este organismo es UNO para las cuatro entidades.
 * Recibe la DESCRIPCION de sus campos y se construye solo.
 *
 * LAS DOS VALIDACIONES Y COMO SE COORDINAN
 * ---------------------------------------------------------------------
 * 1. VALIDACION LOCAL (antes de enviar)
 *    Recorre los campos y aplica la funcion `validar` de cada uno.
 *    Es instantanea y evita peticiones que ya sabemos que fallaran.
 *
 * 2. VALIDACION DEL SERVIDOR (despues de enviar)
 *    Si la API responde 400, trae la lista de campos invalidos:
 *      { "error": { "detalles": [{ "campo": "primerNombre", "mensaje": "..." }] } }
 *    Esta clase EMPAREJA cada detalle con su campo por el nombre y
 *    pinta el error justo donde corresponde.
 *
 * Ese emparejamiento es la razon por la que el `nombre` de cada campo
 * del frontend TIENE que coincidir con el nombre que usa el backend.
 * Si el frontend dijera "nombre1" y el backend "primerNombre", el
 * error llegaria pero no se podria mostrar en su campo.
 */

import { crear, crearIcono } from '../utiles/dom.js';
import { ICONOS } from '../utiles/iconos.js';
import { CampoFormulario } from '../moleculas/campoFormulario.js';

/**
 * @param {object} propiedades
 * @param {Array} propiedades.grupos  [{ leyenda, campos: [...] }]
 * @param {string} propiedades.nota   Texto informativo opcional.
 * @returns {{elemento, obtenerDatos, validar, mostrarErroresServidor,
 *            limpiarErrores, enfocarPrimero, campos}}
 */
export function Formulario({ grupos = [], nota = null } = {}) {
  // Mapa nombre -> objeto del campo. Es lo que permite encontrar un
  // campo por su nombre cuando llega un error del servidor.
  const campos = {};

  const hijosFormulario = [];

  // ---- Resumen de errores (arriba del formulario) ----
  const listaResumen = crear('ul', { clase: 'o-formulario__resumen-lista' });

  const resumenErrores = crear(
    'div',
    {
      clase: 'o-formulario__resumen-errores',
      role: 'alert',

      // tabindex="-1" permite enfocarlo con JavaScript (focus()) pero
      // NO con la tecla Tab. Es lo correcto para un mensaje: queremos
      // llevar al usuario alli, sin agregar una parada extra en el
      // recorrido normal del teclado.
      tabIndex: -1
    },
    crear(
      'p',
      { clase: 'o-formulario__resumen-titulo' },
      crearIcono(ICONOS.error, 'a-icono a-icono--pequeno'),
      'Revisa los siguientes campos:'
    ),
    listaResumen
  );

  hijosFormulario.push(resumenErrores);

  // ---- Nota informativa ----
  if (nota !== null) {
    hijosFormulario.push(
      crear(
        'p',
        { clase: 'o-formulario__nota' },
        crearIcono(ICONOS.informacion, 'a-icono o-formulario__nota-icono'),
        crear('span', { texto: nota })
      )
    );
  }

  // ---- Grupos de campos ----
  for (const grupo of grupos) {
    const camposGrupo = [];

    // <legend> tiene que ser el PRIMER hijo del <fieldset>, o el
    // navegador no lo asocia al grupo.
    if (grupo.leyenda) {
      camposGrupo.push(
        crear('legend', { clase: 'o-formulario__leyenda', texto: grupo.leyenda })
      );
    }

    for (const definicion of grupo.campos) {
      // Un campo puede ser un nodo ya construido (el campo calculado
      // de la edad, por ejemplo) en lugar de una definicion.
      if (definicion.elementoPersonalizado) {
        camposGrupo.push(definicion.elementoPersonalizado);
        continue;
      }

      const campo = CampoFormulario(definicion);

      campos[definicion.nombre] = {
        ...campo,
        // Guardamos la funcion validadora junto al campo.
        validar: definicion.validar ?? null,
        etiqueta: definicion.etiqueta
      };

      camposGrupo.push(campo.elemento);
    }

    hijosFormulario.push(
      crear('fieldset', { clase: 'o-formulario__grupo' }, camposGrupo)
    );
  }

  const elemento = crear(
    'form',
    {
      clase: 'o-formulario',

      // noValidate desactiva los mensajes de validacion NATIVOS del
      // navegador. Por que?
      //   1. Su texto no se puede traducir ni personalizar.
      //   2. Su estilo no se puede cambiar.
      //   3. Solo muestran el PRIMER error, uno por uno.
      // Nosotros mostramos todos juntos y con nuestro diseno. Los
      // atributos required y maxlength se mantienen igual, porque los
      // lectores de pantalla si los usan.
      noValidate: true,

      // Evitamos el envio nativo: el envio lo controla el modal.
      onSubmit: (evento) => evento.preventDefault()
    },
    hijosFormulario
  );

  /** Oculta el resumen y limpia el error de cada campo. */
  function limpiarErrores() {
    resumenErrores.classList.remove('o-formulario__resumen-errores--visible');
    listaResumen.replaceChildren();

    for (const campo of Object.values(campos)) {
      campo.limpiarError();
    }
  }

  /**
   * Muestra una lista de errores en los campos y en el resumen.
   * @param {Array<{campo: string, mensaje: string}>} errores
   */
  function pintarErrores(errores) {
    listaResumen.replaceChildren();

    let primerCampoConError = null;

    for (const error of errores) {
      const campo = campos[error.campo];

      if (campo) {
        campo.mostrarError(error.mensaje);

        if (primerCampoConError === null) {
          primerCampoConError = campo;
        }
      }

      listaResumen.appendChild(crear('li', { texto: error.mensaje }));
    }

    if (errores.length > 0) {
      resumenErrores.classList.add('o-formulario__resumen-errores--visible');

      // Llevamos el foco al resumen. Asi el lector de pantalla lo lee
      // y el usuario de teclado queda justo donde empieza el problema.
      resumenErrores.focus();
    }

    return primerCampoConError;
  }

  return {
    elemento,
    campos,

    /**
     * Recoge los valores de todos los campos en un objeto listo para
     * enviar a la API.
     *
     * Omitimos los campos vacios para que un PUT parcial no
     * sobrescriba con null los datos que el usuario no toco.
     *
     * @returns {object}
     */
    obtenerDatos() {
      const datos = {};

      for (const [nombre, campo] of Object.entries(campos)) {
        const valor = campo.obtenerValor();

        // Cadena vacia significa "no lo lleno", no "ponlo en null".
        if (valor !== '') {
          datos[nombre] = valor;
        }
      }

      return datos;
    },

    /**
     * Ejecuta la validacion LOCAL de todos los campos.
     *
     * Importante: valida TODOS y junta los errores, no se detiene en
     * el primero. El usuario corrige el formulario de una sola vez.
     * Es el mismo criterio que la clase ColectorErrores del backend.
     *
     * @returns {boolean} true si todo es valido.
     */
    validar() {
      limpiarErrores();

      const errores = [];

      for (const [nombre, campo] of Object.entries(campos)) {
        if (campo.validar === null) continue;

        const mensaje = campo.validar(campo.obtenerValor());

        if (mensaje !== null && mensaje !== undefined) {
          errores.push({ campo: nombre, mensaje });
        }
      }

      const primerCampo = pintarErrores(errores);

      // Enfocamos el primer campo con error para que el usuario pueda
      // corregir de inmediato, sin buscarlo.
      if (primerCampo !== null) {
        primerCampo.enfocar();
      }

      return errores.length === 0;
    },

    /**
     * Pinta los errores que devolvio la API (HTTP 400).
     *
     * @param {import('../servicios/clienteApi.js').ErrorApi} error
     */
    mostrarErroresServidor(error) {
      const detalles = error.detalles ?? [];

      // Si la API no detallo los campos, mostramos el mensaje general
      // en el resumen. Siempre hay que decir algo: un formulario que
      // falla en silencio es lo peor para el usuario.
      if (detalles.length === 0) {
        pintarErrores([{ campo: '__general__', mensaje: error.message }]);
        return;
      }

      pintarErrores(detalles);
    },

    limpiarErrores,

    /** Pone el foco en el primer campo. Se llama al abrir el modal. */
    enfocarPrimero() {
      const primero = Object.values(campos)[0];
      if (primero) {
        primero.enfocar();
      }
    }
  };
}
