/**
 * js/organismos/tablaDatos.js
 * ---------------------------------------------------------------------
 * ORGANISMO: Tabla de datos generica
 *
 * UN SOLO COMPONENTE PARA LAS CUATRO ENTIDADES
 * ---------------------------------------------------------------------
 * En lugar de escribir TablaUsuarios, TablaTelefonos, TablaRedes y
 * TablaPerfiles (cuatro archivos casi iguales), escribimos UNA tabla
 * que recibe la DESCRIPCION de sus columnas:
 *
 *   TablaDatos({
 *     columnas: [
 *       { etiqueta: 'Id',     obtener: (fila) => fila.id, clase: 'id' },
 *       { etiqueta: 'Nombre', obtener: (fila) => fila.nombreCompleto }
 *     ],
 *     filas: usuarios
 *   })
 *
 * La propiedad `obtener` es una FUNCION que extrae el valor de cada
 * fila. Puede devolver texto o un nodo del DOM (una insignia, un
 * enlace), asi que la tabla sirve para cualquier dato.
 *
 * Esto es un ejemplo practico de dos principios:
 *   - DRY (Don't Repeat Yourself): no repetir la misma estructura.
 *   - Inversion de control: el componente no decide QUE mostrar, solo
 *     COMO mostrarlo. Lo que se muestra lo decide quien lo usa.
 */

import { crear, crearIcono } from '../utiles/dom.js';
import { ICONOS } from '../utiles/iconos.js';
import { BotonIcono } from '../atomos/boton.js';

/**
 * @param {object} propiedades
 * @param {string} propiedades.titulo
 * @param {Array} propiedades.columnas  [{ etiqueta, obtener, clase }]
 * @param {Array} propiedades.filas     Los datos.
 * @param {function} propiedades.acciones  (fila) => [{icono, etiqueta, onClick, variante}]
 * @param {function} propiedades.claveFila  (fila) => string unico. Para data-clave.
 * @param {HTMLElement} propiedades.encabezadoAcciones  Botones de la cabecera.
 * @param {HTMLElement} propiedades.pie   El paginador.
 * @returns {HTMLElement}
 */
export function TablaDatos({
  titulo = '',
  columnas = [],
  filas = [],
  acciones = null,
  claveFila = null,
  encabezadoAcciones = null,
  pie = null,
  onClicFila = null
} = {}) {
  // ---- Encabezado de la tabla ----
  const celdasEncabezado = columnas.map((columna) =>
    crear('th', {
      clase: 'o-tabla-datos__celda-encabezado',

      // scope="col" le dice al lector de pantalla que este th
      // encabeza una COLUMNA (no una fila). Es lo que le permite
      // anunciar "Nombre: Grace Hopper" al navegar por las celdas.
      scope: 'col',

      texto: columna.etiqueta
    })
  );

  if (acciones !== null) {
    celdasEncabezado.push(
      crear(
        'th',
        {
          clase:
            'o-tabla-datos__celda-encabezado o-tabla-datos__celda-encabezado--acciones',
          scope: 'col'
        },
        // El encabezado de acciones no necesita texto visible, pero el
        // lector de pantalla si tiene que poder anunciarlo.
        crear('span', { clase: 'solo-lectores', texto: 'Acciones' })
      )
    );
  }

  // ---- Cuerpo de la tabla ----
  const filasCuerpo = filas.map((fila) => {
    const celdas = columnas.map((columna) => {
      const valor = columna.obtener(fila);

      return crear(
        'td',
        {
          clase: `o-tabla-datos__celda${columna.clase ? ` o-tabla-datos__celda--${columna.clase}` : ''}`,

          // AQUI ESTA LA CLAVE DEL DISENIO RESPONSIVO DE LA TABLA.
          // En movil, el CSS lee este atributo con
          // content: attr(data-etiqueta) y lo muestra como el nombre
          // del campo. Asi la tabla se convierte en tarjetas sin
          // duplicar el HTML.
          dataEtiqueta: columna.etiqueta,

          title: columna.titulo ? columna.titulo(fila) : null
        },
        // El valor puede ser texto o un nodo del DOM (una insignia,
        // un enlace). `crear` sabe manejar los dos casos.
        valor
      );
    });

    if (acciones !== null) {
      const botonesFila = acciones(fila).map((accion) =>
        BotonIcono({
          icono: accion.icono,
          etiqueta: accion.etiqueta,
          variante: accion.variante ?? 'icono',
          pequeno: true,
          onClick: (evento) => {
            // stopPropagation evita que el clic en el boton dispare
            // tambien el onClicFila de la fila entera. Sin esto, al
            // pulsar "Eliminar" se abriria el detalle ademas del
            // dialogo de confirmacion.
            evento.stopPropagation();
            accion.onClick(fila);
          }
        })
      );

      celdas.push(
        crear(
          'td',
          { clase: 'o-tabla-datos__celda o-tabla-datos__celda--acciones' },
          crear('div', { clase: 'o-tabla-datos__acciones' }, botonesFila)
        )
      );
    }

    return crear(
      'tr',
      {
        clase: 'o-tabla-datos__fila',
        dataClave: claveFila ? claveFila(fila) : null,
        onClick: onClicFila ? () => onClicFila(fila) : null,

        // Si la fila es clicable, el cursor tiene que avisarlo.
        estilo: onClicFila ? { cursor: 'pointer' } : null
      },
      celdas
    );
  });

  // ---- Cabecera del organismo ----
  const cabecera = crear(
    'div',
    { clase: 'o-tabla-datos__cabecera' },
    crear(
      'h2',
      { clase: 'o-tabla-datos__titulo' },
      titulo,
      crear('span', {
        clase: 'a-insignia a-insignia--primaria',
        texto: String(filas.length)
      })
    ),
    encabezadoAcciones
  );

  // ---- Ensamblado ----
  return crear(
    'section',
    { clase: 'o-tabla-datos-envoltura' },
    cabecera,
    crear(
      'div',
      {
        clase: 'o-tabla-datos__contenedor',

        // tabindex="0" hace que el contenedor sea enfocable, para que
        // se pueda desplazar la tabla con las flechas del teclado.
        // Sin esto, quien no usa raton no puede ver las columnas de
        // la derecha en una pantalla angosta.
        tabIndex: 0,

        role: 'region',
        ariaLabel: `Tabla de ${titulo}`
      },
      crear(
        'table',
        { clase: 'o-tabla-datos' },

        // <caption> es el titulo semantico de la tabla. Lo ocultamos
        // visualmente (ya esta en el h2) pero el lector de pantalla
        // lo anuncia al entrar, lo que da contexto inmediato.
        crear('caption', { clase: 'solo-lectores', texto: titulo }),

        crear(
          'thead',
          { clase: 'o-tabla-datos__encabezado' },
          crear('tr', {}, celdasEncabezado)
        ),
        crear('tbody', {}, filasCuerpo)
      )
    ),
    pie
  );
}

/**
 * Celda con un texto principal y un texto secundario debajo.
 * Patron muy util para ahorrar columnas: "Grace Hopper" con
 * "Nueva York" en pequeno debajo.
 *
 * @param {string} principal
 * @param {string} secundario
 */
export function CeldaDoble(principal, secundario) {
  return crear(
    'div',
    {},
    crear('span', { texto: principal }),
    secundario
      ? crear('span', { clase: 'o-tabla-datos__celda-secundario', texto: secundario })
      : null
  );
}

/**
 * Celda con un enlace externo.
 *
 * SEGURIDAD: target="_blank" SIEMPRE va con rel="noopener noreferrer".
 *
 *   noopener   -> impide que la pagina abierta acceda a window.opener
 *                 y pueda redirigir la nuestra (ataque "tabnabbing").
 *   noreferrer -> no envia la cabecera Referer, asi el sitio destino
 *                 no sabe de donde viene el usuario.
 *
 * Es una de esas reglas que hay que aplicar siempre, sin excepcion.
 */
export function CeldaEnlace(url, textoVisible) {
  if (!url) {
    return '—';
  }

  return crear(
    'a',
    {
      clase: 'p-recursos__url',
      href: url,
      target: '_blank',
      rel: 'noopener noreferrer',

      // El title muestra la URL completa al pasar el puntero, porque
      // el texto visible va recortado.
      title: url
    },
    textoVisible,
    crearIcono(ICONOS.enlaceExterno, 'a-icono a-icono--pequeno')
  );
}
