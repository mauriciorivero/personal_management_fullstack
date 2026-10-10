/**
 * js/organismos/modal.js
 * ---------------------------------------------------------------------
 * ORGANISMO: Ventana modal
 *
 * USAMOS EL ELEMENTO NATIVO <dialog> DE HTML5
 * ---------------------------------------------------------------------
 * Esta es una de las decisiones mas importantes del frontend. El
 * metodo showModal() nos regala, gratis y bien hecho:
 *
 *   1. ATRAPAR EL FOCO (focus trap): con el modal abierto, la
 *      tabulacion no puede salir de el. Implementarlo a mano exige
 *      detectar todos los elementos enfocables, ordenarlos y
 *      reciclar el foco en los extremos. Son ~80 lineas delicadas.
 *
 *   2. LA TECLA ESCAPE cierra el dialogo sin escribir ni una linea.
 *
 *   3. EL RESTO DE LA PAGINA QUEDA INERTE: no se puede hacer clic ni
 *      tabular hacia el contenido de atras.
 *
 *   4. EL VELO lo dibuja el pseudo-elemento ::backdrop.
 *
 *   5. EL FOCO VUELVE SOLO al boton que abrio el modal al cerrarse.
 *
 * Hacer todo eso con <div> es la causa numero uno de modales
 * inaccesibles en la web. Si el navegador ya lo resuelve, se usa.
 */

import { crear, crearIcono } from '../utiles/dom.js';
import { ICONOS } from '../utiles/iconos.js';
import { Boton, BotonIcono } from '../atomos/boton.js';

/**
 * Crea una ventana modal.
 *
 * @param {object} propiedades
 * @param {string} propiedades.titulo
 * @param {string} propiedades.descripcion
 * @param {HTMLElement} propiedades.cuerpo    Contenido (un formulario).
 * @param {Array} propiedades.acciones        [{ texto, variante, onClick, icono }]
 * @param {function} propiedades.onCerrar     Se llama al cerrar.
 * @returns {{elemento, abrir, cerrar, establecerCargando}}
 */
export function Modal({
  titulo = '',
  descripcion = null,
  cuerpo = null,
  acciones = [],
  onCerrar = null,
  variante = null
} = {}) {
  // Id unico para conectar el dialogo con su titulo por ARIA.
  const idTitulo = `modal-titulo-${Math.random().toString(36).slice(2, 9)}`;

  const botonCerrar = BotonIcono({
    icono: 'cerrar',
    etiqueta: 'Cerrar',
    onClick: () => cerrar()
  });

  // Guardamos los botones para poder deshabilitarlos mientras se
  // envia el formulario (evita el doble envio por doble clic).
  const botonesAccion = acciones.map((accion) =>
    Boton({
      texto: accion.texto,
      variante: accion.variante ?? 'texto',
      icono: accion.icono ?? null,
      onClick: accion.onClick,
      tipo: accion.tipo ?? 'button'
    })
  );

  const cabecera =
    variante === 'confirmacion'
      ? crear(
          'div',
          { clase: 'o-modal__cabecera' },
          crear(
            'div',
            { clase: 'o-modal__icono-alerta' },
            crearIcono(ICONOS.advertencia, 'a-icono a-icono--grande')
          ),
          crear(
            'div',
            {},
            crear('h2', { clase: 'o-modal__titulo', id: idTitulo, texto: titulo }),
            descripcion
              ? crear('p', { clase: 'o-modal__descripcion', texto: descripcion })
              : null
          )
        )
      : crear(
          'div',
          { clase: 'o-modal__cabecera' },
          crear(
            'div',
            {},
            crear('h2', { clase: 'o-modal__titulo', id: idTitulo, texto: titulo }),
            descripcion
              ? crear('p', { clase: 'o-modal__descripcion', texto: descripcion })
              : null
          ),
          botonCerrar
        );

  const elemento = crear(
    'dialog',
    {
      clase: `o-modal${variante ? ` o-modal--${variante}` : ''}`,

      // aria-labelledby conecta el dialogo con su titulo. El lector de
      // pantalla anuncia "Crear usuario, dialogo" al abrirlo.
      ariaLabelledby: idTitulo,

      /**
       * El evento 'close' del <dialog> se dispara tanto si cerramos
       * con close() como si el usuario pulsa Escape. Enganchar aqui
       * la limpieza garantiza que se ejecute en los dos casos.
       */
      onClose: () => {
        if (onCerrar !== null) {
          onCerrar();
        }
        // Quitamos el dialogo del DOM. Si no lo hicieramos, cada
        // apertura dejaria un <dialog> huerfano acumulandose.
        elemento.remove();
      },

      /**
       * Cerrar al hacer clic fuera del contenido.
       *
       * Truco: el <dialog> ocupa toda la pantalla, pero su contenido
       * visible es solo la caja central. Si el clic fue exactamente
       * sobre el <dialog> (y no sobre un hijo), significa que cayo en
       * el velo, asi que cerramos.
       */
      onClick: (evento) => {
        if (evento.target === elemento) {
          cerrar();
        }
      }
    },
    crear(
      'div',
      { clase: 'o-modal__contenido' },
      cabecera,
      cuerpo ? crear('div', { clase: 'o-modal__cuerpo' }, cuerpo) : null,
      botonesAccion.length > 0
        ? crear('div', { clase: 'o-modal__pie' }, botonesAccion)
        : null
    )
  );

  /** Abre el modal. */
  function abrir() {
    // El <dialog> tiene que estar en el DOM antes de llamar a
    // showModal(), o el navegador lanza un error.
    if (!elemento.isConnected) {
      document.body.appendChild(elemento);
    }

    // showModal() (no show()) es el que atrapa el foco y dibuja el
    // velo. show() abre el dialogo "no modal", sin esas ventajas.
    elemento.showModal();
  }

  /** Cierra el modal. Dispara el evento 'close'. */
  function cerrar() {
    if (elemento.open) {
      elemento.close();
    }
  }

  return {
    elemento,
    abrir,
    cerrar,

    /**
     * Pone el modal en estado "guardando": deshabilita los botones
     * para que el usuario no envie el formulario dos veces.
     *
     * El doble envio es un bug muy comun: el usuario hace doble clic
     * en "Guardar" y se crean DOS registros identicos.
     *
     * @param {boolean} cargando
     */
    establecerCargando(cargando) {
      for (const boton of botonesAccion) {
        boton.disabled = cargando;
      }
      botonCerrar.disabled = cargando;
    }
  };
}

/**
 * Dialogo de confirmacion para acciones destructivas.
 *
 * POR QUE CONFIRMAR ANTES DE BORRAR?
 * Porque un DELETE no se puede deshacer. El costo de un clic extra es
 * minimo frente al de perder datos por error.
 *
 * Y por que no window.confirm()? Porque bloquea el navegador entero,
 * no se puede estilizar y, sobre todo, no permite explicar las
 * CONSECUENCIAS. Aqui si podemos avisar: "esto tambien borrara sus 2
 * telefonos y 1 perfil social".
 *
 * @param {object} propiedades
 * @param {string} propiedades.titulo
 * @param {string} propiedades.mensaje
 * @param {string} propiedades.textoConfirmar
 * @param {function} propiedades.onConfirmar  Puede ser async.
 * @returns {{abrir: function}}
 */
export function ModalConfirmacion({
  titulo = 'Confirmar la accion',
  mensaje = 'Esta accion no se puede deshacer.',
  textoConfirmar = 'Eliminar',
  onConfirmar = null
} = {}) {
  let modal = null;

  modal = Modal({
    titulo,
    descripcion: mensaje,
    variante: 'confirmacion',
    acciones: [
      {
        texto: 'Cancelar',
        variante: 'texto',
        onClick: () => modal.cerrar()
      },
      {
        texto: textoConfirmar,
        variante: 'peligro',
        icono: 'eliminar',
        onClick: async () => {
          // Deshabilitamos los botones mientras corre la peticion.
          modal.establecerCargando(true);

          try {
            if (onConfirmar !== null) {
              await onConfirmar();
            }
            modal.cerrar();
          } catch (error) {
            // Si falla, reactivamos los botones para que el usuario
            // pueda reintentar o cancelar. Quien llama se encarga de
            // mostrar la notificacion del error.
            modal.establecerCargando(false);
            throw error;
          }
        }
      }
    ]
  });

  return modal;
}
