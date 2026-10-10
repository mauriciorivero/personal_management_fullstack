/**
 * js/organismos/panelDetalleUsuario.js
 * ---------------------------------------------------------------------
 * ORGANISMO: Panel de detalle de un usuario
 *
 * Es la vista mas valiosa del proyecto desde el punto de vista
 * didactico, porque muestra las TRES tablas relacionadas en una sola
 * pantalla, a partir de UNA sola peticion:
 *
 *   GET /api/usuarios/5
 *
 * Y la respuesta trae todo anidado:
 *
 *   {
 *     "id": 5, "nombreCompleto": "Grace Brewster Hopper Murray",
 *     "telefonos": [ { "id": 3, "numeroTelefono": "3001234567", ... } ],
 *     "perfilesSociales": [
 *       { "redSocialId": 7, "usuarioId": 5,
 *         "redSocial": { "nombre": "LinkedIn", ... } }
 *     ]
 *   }
 *
 * Ese JSON lo armo el metodo privado #cargarRelaciones de
 * services/usuario.service.js, con dos consultas en paralelo
 * (Promise.all) y un INNER JOIN para traer el nombre de la red social.
 *
 * Que el aprendiz pueda seguir el dato desde la tabla de MySQL hasta
 * el pixel en pantalla es justamente el objetivo del curso.
 */

import { crear, crearIcono } from '../utiles/dom.js';
import { ICONOS } from '../utiles/iconos.js';
import { Boton, BotonIcono } from '../atomos/boton.js';
import { Insignia, InsigniaEstado } from '../atomos/insignia.js';
import { EstadoVacio } from '../moleculas/estadoVacio.js';
import { fechaLarga, iniciales, urlCompacta, oGuion } from '../utiles/formato.js';

/**
 * @param {object} propiedades
 * @param {object} propiedades.usuario  El JSON de GET /api/usuarios/:id
 * @param {object} propiedades.acciones  Manejadores de los botones.
 * @returns {HTMLElement}
 */
export function PanelDetalleUsuario({ usuario, acciones = {} } = {}) {
  // ---- Cabecera: avatar, nombre e insignias ----
  const cabecera = crear(
    'div',
    { clase: 'o-panel-detalle__cabecera' },
    crear('div', {
      clase: 'o-panel-detalle__avatar',

      // Las iniciales son la solucion mas robusta cuando no hay foto:
      // siempre hay algo que mostrar y nunca falla una carga.
      texto: iniciales(usuario.nombreCompleto),

      // El avatar es decorativo: el nombre ya esta escrito al lado.
      ariaHidden: 'true'
    }),
    crear(
      'div',
      { clase: 'o-panel-detalle__identidad' },
      crear('p', {
        clase: 'o-panel-detalle__nombre',
        texto: usuario.nombreCompleto
      }),
      crear(
        'div',
        { clase: 'o-panel-detalle__meta' },
        Insignia({ texto: `id ${usuario.id}`, mono: true }),
        InsigniaEstado(usuario.estado),
        Insignia({
          texto: `${usuario.edad} ${usuario.edad === 1 ? 'anio' : 'anios'}`,
          variante: 'terciaria'
        })
      )
    )
  );

  // ---- Datos del usuario ----
  // Usamos <dl> (lista de definiciones), que es el elemento HTML
  // semantico correcto para pares clave/valor. El lector de pantalla
  // los anuncia emparejados: "Ciudad de domicilio: Nueva York".
  const datos = crear(
    'dl',
    { clase: 'm-tarjeta__cuerpo' },
    filaDato('Primer nombre', oGuion(usuario.primerNombre)),
    filaDato('Segundo nombre', oGuion(usuario.segundoNombre)),
    filaDato('Primer apellido', oGuion(usuario.primerApellido)),
    filaDato('Segundo apellido', oGuion(usuario.segundoApellido)),
    filaDato('Fecha de nacimiento', fechaLarga(usuario.fechaNacimiento)),
    filaDato(
      'Edad calculada',
      crear(
        'span',
        {},
        `${usuario.edad} `,
        crear('span', {
          clase: 'a-insignia a-insignia--primaria',
          texto: 'la calcula el servidor'
        })
      )
    ),
    filaDato('Ciudad de domicilio', oGuion(usuario.ciudadDomicilio)),
    filaDato('Estado', InsigniaEstado(usuario.estado))
  );

  // ---- Seccion de telefonos ----
  const telefonos = usuario.telefonos ?? [];

  const seccionTelefonos = crear(
    'section',
    { clase: 'o-panel-detalle__seccion' },
    crear(
      'div',
      { clase: 'o-panel-detalle__seccion-cabecera' },
      crear(
        'h3',
        { clase: 'o-panel-detalle__seccion-titulo' },
        crearIcono(ICONOS.telefono, 'a-icono'),
        `Telefonos (${telefonos.length})`
      ),
      Boton({
        texto: 'Agregar',
        variante: 'texto',
        icono: 'agregar',
        onClick: () => acciones.onAgregarTelefono?.(usuario)
      })
    ),
    telefonos.length === 0
      ? EstadoVacio({
          titulo: 'Sin telefonos',
          mensaje: 'Este usuario todavia no tiene telefonos registrados.',
          icono: 'telefono',
          compacto: true
        })
      : crear(
          'ul',
          { clase: 'o-panel-detalle__lista' },
          telefonos.map((telefono) =>
            crear(
              'li',
              { clase: 'o-panel-detalle__item' },
              crear(
                'div',
                { clase: 'o-panel-detalle__item-icono' },
                crearIcono(ICONOS.telefono, 'a-icono a-icono--pequeno')
              ),
              crear(
                'div',
                { clase: 'o-panel-detalle__item-contenido' },
                crear('p', {
                  clase: 'o-panel-detalle__item-principal',
                  texto: telefono.numeroTelefono
                }),
                crear('p', {
                  clase: 'o-panel-detalle__item-secundario',
                  texto: `${telefono.tipoTelefono} · id ${telefono.id}`
                })
              ),
              InsigniaEstado(telefono.activo),
              crear(
                'div',
                { clase: 'o-panel-detalle__item-acciones' },
                BotonIcono({
                  icono: telefono.esActivo ? 'error' : 'exito',
                  etiqueta: telefono.esActivo
                    ? `Desactivar el telefono ${telefono.numeroTelefono}`
                    : `Activar el telefono ${telefono.numeroTelefono}`,
                  pequeno: true,
                  onClick: () =>
                    acciones.onCambiarEstadoTelefono?.(telefono, !telefono.esActivo)
                }),
                BotonIcono({
                  icono: 'editar',
                  etiqueta: `Editar el telefono ${telefono.numeroTelefono}`,
                  pequeno: true,
                  onClick: () => acciones.onEditarTelefono?.(telefono)
                }),
                BotonIcono({
                  icono: 'eliminar',
                  etiqueta: `Eliminar el telefono ${telefono.numeroTelefono}`,
                  pequeno: true,
                  onClick: () => acciones.onEliminarTelefono?.(telefono)
                })
              )
            )
          )
        )
  );

  // ---- Seccion de perfiles sociales ----
  const perfiles = usuario.perfilesSociales ?? [];

  const seccionPerfiles = crear(
    'section',
    { clase: 'o-panel-detalle__seccion' },
    crear(
      'div',
      { clase: 'o-panel-detalle__seccion-cabecera' },
      crear(
        'h3',
        { clase: 'o-panel-detalle__seccion-titulo' },
        crearIcono(ICONOS.redSocial, 'a-icono'),
        `Perfiles sociales (${perfiles.length})`
      ),
      Boton({
        texto: 'Agregar',
        variante: 'texto',
        icono: 'agregar',
        onClick: () => acciones.onAgregarPerfil?.(usuario)
      })
    ),
    perfiles.length === 0
      ? EstadoVacio({
          titulo: 'Sin perfiles sociales',
          mensaje: 'Este usuario todavia no tiene perfiles en redes sociales.',
          icono: 'redSocial',
          compacto: true
        })
      : crear(
          'ul',
          { clase: 'o-panel-detalle__lista' },
          perfiles.map((perfil) =>
            crear(
              'li',
              { clase: 'o-panel-detalle__item' },
              crear(
                'div',
                { clase: 'o-panel-detalle__item-icono' },
                crearIcono(ICONOS.globo, 'a-icono a-icono--pequeno')
              ),
              crear(
                'div',
                { clase: 'o-panel-detalle__item-contenido' },
                crear('p', {
                  clase: 'o-panel-detalle__item-principal',
                  // El nombre de la red viene del JOIN que hizo el
                  // service. Si no estuviera, mostramos el id.
                  texto: perfil.redSocial?.nombre ?? `Red social ${perfil.redSocialId}`
                }),
                perfil.urlPerfil
                  ? crear(
                      'a',
                      {
                        clase:
                          'o-panel-detalle__item-secundario o-panel-detalle__enlace',
                        href: perfil.urlPerfil,
                        target: '_blank',

                        // Obligatorio con target="_blank" (ver
                        // tablaDatos.js para la explicacion completa).
                        rel: 'noopener noreferrer',
                        title: perfil.urlPerfil,
                        texto: urlCompacta(perfil.urlPerfil)
                      }
                    )
                  : crear('p', {
                      clase: 'o-panel-detalle__item-secundario',
                      texto: 'Sin URL de perfil'
                    })
              ),
              // La llave compuesta, a la vista. Es el detalle que mas
              // cuesta entender de este modelo de datos.
              Insignia({
                texto: `${perfil.redSocialId}:${perfil.usuarioId}`,
                mono: true,
                titulo: 'Llave compuesta (RED_SOCIAL_id : USUARIO_id)'
              }),
              crear(
                'div',
                { clase: 'o-panel-detalle__item-acciones' },
                BotonIcono({
                  icono: 'editar',
                  etiqueta: 'Editar la URL del perfil',
                  pequeno: true,
                  onClick: () => acciones.onEditarPerfil?.(perfil)
                }),
                BotonIcono({
                  icono: 'eliminar',
                  etiqueta: 'Eliminar el perfil social',
                  pequeno: true,
                  onClick: () => acciones.onEliminarPerfil?.(perfil)
                })
              )
            )
          )
        )
  );

  return crear(
    'div',
    { clase: 'o-panel-detalle' },
    cabecera,
    crear('div', { clase: 'm-tarjeta m-tarjeta--contorno' }, datos),
    seccionTelefonos,
    seccionPerfiles
  );
}

/**
 * Crea una fila de dato (<dt> etiqueta + <dd> valor).
 * Funcion auxiliar local: no se exporta porque solo sirve aqui.
 */
function filaDato(etiqueta, valor) {
  return crear(
    'div',
    { clase: 'm-tarjeta__dato' },
    crear('dt', { clase: 'm-tarjeta__dato-etiqueta', texto: etiqueta }),
    crear('dd', { clase: 'm-tarjeta__dato-valor' }, valor)
  );
}
