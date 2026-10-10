/**
 * js/paginas/paginaTelefonos.js
 * ---------------------------------------------------------------------
 * PAGINA: Gestion de telefonos
 *
 * LO QUE ESTA PAGINA ENSENA: LA LLAVE FORANEA.
 *
 * Un telefono NO puede existir sin su usuario (TELEFONO.USUARIO_id es
 * NOT NULL y apunta a USUARIO.id). Eso tiene dos consecuencias
 * visibles en esta pantalla:
 *
 *   1. El formulario obliga a ELEGIR un usuario de un desplegable.
 *      No se escribe el id a mano: se elige de la lista real.
 *
 *   2. Si no hay ningun usuario creado, no se puede crear un
 *      telefono. La pagina lo detecta y lo explica, en lugar de
 *      dejar al usuario chocar con un error 404 del servidor.
 *
 * Ese segundo punto es un principio de diseno importante: es mejor
 * PREVENIR el error que mostrarlo despues.
 */

import { CabeceraPagina } from '../plantillas/panelAdministracion.js';
import { TablaDatos, CeldaDoble } from '../organismos/tablaDatos.js';
import { Modal, ModalConfirmacion } from '../organismos/modal.js';
import { Formulario } from '../organismos/formulario.js';
import { BarraBusqueda } from '../moleculas/barraBusqueda.js';
import { Paginador } from '../moleculas/paginador.js';
import { EstadoVacio, EstadoError } from '../moleculas/estadoVacio.js';
import { notificador } from '../moleculas/notificacion.js';
import { Boton } from '../atomos/boton.js';
import { Insignia, InsigniaEstado } from '../atomos/insignia.js';
import { CargadorBloque } from '../atomos/cargador.js';

import { telefonoServicio } from '../servicios/telefono.servicio.js';
import { usuarioServicio } from '../servicios/usuario.servicio.js';

import { validarTelefono, validarOpcion, validarId } from '../utiles/validadores.js';
import { CONFIGURACION } from '../config/configuracion.js';

export function PaginaTelefonos({ onContenido, onTotalCambiado = null } = {}) {
  let filtros = { pagina: 1, limite: CONFIGURACION.limitePorPagina };
  let ultimaRespuesta = { telefonos: [], meta: null };

  // Mapa id -> nombre del usuario. Lo necesitamos porque la API
  // devuelve el telefono con `usuarioId`, no con el nombre.
  //
  // Alternativa descartada: pedir el usuario de cada telefono por
  // separado. Con 20 telefonos serian 20 peticiones (el clasico
  // problema "N + 1"). Es mucho mejor traer la lista de usuarios UNA
  // vez y resolver los nombres en memoria.
  let mapaUsuarios = new Map();

  const barraBusqueda = BarraBusqueda({
    sugerencia: 'Buscar por numero de telefono...',
    filtros: [
      {
        id: 'filtro-tipo-telefono',
        nombre: 'tipo',
        etiqueta: 'Filtrar por tipo',
        opciones: CONFIGURACION.tiposTelefono.map((tipo) => ({
          valor: tipo,
          texto: tipo
        })),
        textoVacio: 'Todo tipo'
      },
      {
        id: 'filtro-activo-telefono',
        nombre: 'activo',
        etiqueta: 'Filtrar por estado',
        opciones: [
          { valor: '1', texto: 'Activos' },
          { valor: '0', texto: 'Inactivos' }
        ],
        textoVacio: 'Todo estado'
      }
    ],
    onCambio: (valores) => {
      filtros = { ...valores, pagina: 1, limite: filtros.limite };
      cargar();
    },
    onRecargar: () => cargar()
  });

  /** Carga el catalogo de usuarios para resolver nombres y llenar el select. */
  async function cargarMapaUsuarios() {
    const { usuarios } = await usuarioServicio.listar({ limite: 200 });

    mapaUsuarios = new Map(
      usuarios.map((usuario) => [usuario.id, usuario])
    );
  }

  async function cargar() {
    pintar(CargadorBloque({ mensaje: 'Consultando telefonos en la API...' }));

    try {
      // Promise.all lanza las dos peticiones EN PARALELO. Si las
      // hicieramos una tras otra (await, await), tardaria el doble.
      const [respuesta] = await Promise.all([
        telefonoServicio.listar(filtros),
        cargarMapaUsuarios()
      ]);

      ultimaRespuesta = respuesta;

      if (onTotalCambiado !== null) {
        onTotalCambiado(respuesta.meta?.total ?? 0);
      }

      pintarTabla();
    } catch (error) {
      pintar(EstadoError({ error, onReintentar: cargar }));
      notificador.desdeErrorApi(error);
    }
  }

  function pintar(...nodos) {
    onContenido(
      CabeceraPagina({
        titulo: 'Telefonos',
        descripcion:
          'Relacion 1 a N con USUARIO: un usuario tiene muchos telefonos. ' +
          'La columna TELEFONO.USUARIO_id es la llave foranea que lo garantiza.',
        accion: Boton({
          texto: 'Nuevo telefono',
          variante: 'primario',
          icono: 'agregar',
          onClick: () => abrirFormulario(null)
        })
      }),
      barraBusqueda.elemento,
      ...nodos
    );
  }

  /** Devuelve el nombre del usuario dueno del telefono. */
  function nombreUsuario(usuarioId) {
    return mapaUsuarios.get(usuarioId)?.nombreCompleto ?? `Usuario ${usuarioId}`;
  }

  function pintarTabla() {
    const { telefonos, meta } = ultimaRespuesta;

    if (telefonos.length === 0) {
      const hayFiltros = Boolean(filtros.buscar || filtros.tipo || filtros.activo);

      pintar(
        EstadoVacio({
          titulo: hayFiltros ? 'Sin resultados' : 'No hay telefonos registrados',
          mensaje: hayFiltros
            ? 'Ningun telefono coincide con los filtros aplicados.'
            : 'Registra el primer telefono. Necesitas al menos un usuario creado.',
          icono: hayFiltros ? 'buscar' : 'telefono',
          accion: hayFiltros
            ? {
                texto: 'Limpiar filtros',
                icono: 'limpiar',
                onClick: () => {
                  barraBusqueda.limpiar();
                  filtros = { pagina: 1, limite: filtros.limite };
                  cargar();
                }
              }
            : { texto: 'Crear el primer telefono', onClick: () => abrirFormulario(null) }
        })
      );
      return;
    }

    pintar(
      TablaDatos({
        titulo: 'Telefonos',
        columnas: [
          { etiqueta: 'Id', clase: 'id', obtener: (t) => String(t.id) },
          {
            etiqueta: 'Numero',
            clase: 'principal',
            obtener: (t) => CeldaDoble(t.numeroTelefono, t.numeroEnmascarado)
          },
          {
            etiqueta: 'Tipo',
            obtener: (t) => Insignia({ texto: t.tipoTelefono ?? '—', variante: 'primaria' })
          },
          {
            etiqueta: 'Usuario',
            obtener: (t) => CeldaDoble(nombreUsuario(t.usuarioId), `USUARIO_id ${t.usuarioId}`)
          },
          { etiqueta: 'Estado', obtener: (t) => InsigniaEstado(t.activo) }
        ],
        filas: telefonos,
        claveFila: (t) => String(t.id),
        acciones: (telefono) => [
          {
            icono: telefono.esActivo ? 'error' : 'exito',
            etiqueta: telefono.esActivo
              ? `Desactivar el telefono ${telefono.numeroTelefono}`
              : `Activar el telefono ${telefono.numeroTelefono}`,
            onClick: () => cambiarEstado(telefono, !telefono.esActivo)
          },
          {
            icono: 'editar',
            etiqueta: `Editar el telefono ${telefono.numeroTelefono}`,
            onClick: () => abrirFormulario(telefono)
          },
          {
            icono: 'eliminar',
            etiqueta: `Eliminar el telefono ${telefono.numeroTelefono}`,
            onClick: () => confirmarBorrado(telefono)
          }
        ],
        pie: Paginador({
          meta,
          onCambiarPagina: (pagina) => {
            filtros = { ...filtros, pagina };
            cargar();
          },
          onCambiarLimite: (limite) => {
            filtros = { ...filtros, limite, pagina: 1 };
            cargar();
          }
        })
      })
    );
  }

  /** Activa o desactiva con PATCH (baja logica, no borra la fila). */
  async function cambiarEstado(telefono, activar) {
    try {
      await telefonoServicio.cambiarEstado(telefono.id, activar);
      notificador.exito(
        `Telefono ${telefono.numeroTelefono} ${activar ? 'activado' : 'desactivado'}.`
      );
      await cargar();
    } catch (error) {
      notificador.desdeErrorApi(error);
    }
  }

  async function abrirFormulario(telefono) {
    const esEdicion = telefono !== null;

    // Nos aseguramos de tener el catalogo de usuarios cargado.
    if (mapaUsuarios.size === 0) {
      try {
        await cargarMapaUsuarios();
      } catch (error) {
        notificador.desdeErrorApi(error);
        return;
      }
    }

    // PREVENIR EL ERROR EN LUGAR DE MOSTRARLO:
    // sin usuarios no hay llave foranea posible, asi que lo
    // explicamos antes de que el servidor responda 404.
    if (mapaUsuarios.size === 0) {
      notificador.advertencia(
        'No hay usuarios registrados. Un telefono necesita un usuario (llave foranea USUARIO_id), ' +
          'asi que primero crea un usuario en la seccion "Usuarios".'
      );
      return;
    }

    const opcionesUsuarios = Array.from(mapaUsuarios.values()).map((usuario) => ({
      valor: usuario.id,
      texto: `${usuario.nombreCompleto} (id ${usuario.id})`
    }));

    const formulario = Formulario({
      nota: esEdicion
        ? `PUT /api/telefonos/${telefono.id}`
        : 'POST /api/telefonos · el campo usuarioId es la llave foranea y la API verifica que el usuario exista antes de insertar.',
      grupos: [
        {
          campos: [
            {
              id: 'tel-numero',
              nombre: 'numeroTelefono',
              etiqueta: 'Numero de telefono',
              tipo: 'tel',
              valor: telefono?.numeroTelefono ?? '',
              requerido: true,
              maximo: CONFIGURACION.longitudMaximaTexto,
              autocompletar: 'tel',
              ayuda: 'La API rechaza numeros duplicados con un 409 Conflict.',
              validar: (valor) => validarTelefono(valor)
            },
            {
              id: 'tel-tipo',
              nombre: 'tipoTelefono',
              etiqueta: 'Tipo de telefono',
              control: 'seleccion',
              valor: telefono?.tipoTelefono ?? '',
              requerido: true,
              textoVacio: 'Selecciona un tipo',
              opciones: CONFIGURACION.tiposTelefono.map((tipo) => ({
                valor: tipo,
                texto: tipo
              })),
              validar: (valor) =>
                validarOpcion(valor, CONFIGURACION.tiposTelefono, {
                  etiqueta: 'El tipo de telefono'
                })
            },
            {
              id: 'tel-usuario',
              nombre: 'usuarioId',
              etiqueta: 'Usuario propietario',
              control: 'seleccion',
              valor: String(telefono?.usuarioId ?? ''),
              requerido: true,
              textoVacio: 'Selecciona un usuario',
              opciones: opcionesUsuarios,
              ayuda: 'Llave foranea TELEFONO.USUARIO_id -> USUARIO.id',
              validar: (valor) => validarId(valor, { etiqueta: 'El usuario propietario' })
            },
            {
              id: 'tel-activo',
              nombre: 'activo',
              etiqueta: 'Estado',
              control: 'seleccion',
              valor: String(telefono?.activo ?? 1),
              opciones: [
                { valor: '1', texto: 'Activo' },
                { valor: '0', texto: 'Inactivo' }
              ],
              ayuda: 'Columna activo: 1 activo, 0 inactivo.'
            }
          ]
        }
      ]
    });

    const modal = Modal({
      titulo: esEdicion ? `Editar el telefono ${telefono.id}` : 'Nuevo telefono',
      cuerpo: formulario.elemento,
      acciones: [
        { texto: 'Cancelar', variante: 'texto', onClick: () => modal.cerrar() },
        {
          texto: esEdicion ? 'Guardar cambios' : 'Crear telefono',
          variante: 'primario',
          icono: 'guardar',
          onClick: async () => {
            if (!formulario.validar()) return;

            modal.establecerCargando(true);

            try {
              const datos = formulario.obtenerDatos();

              if (esEdicion) {
                await telefonoServicio.actualizar(telefono.id, datos);
                notificador.exito('Telefono actualizado correctamente.');
              } else {
                await telefonoServicio.crear(datos);
                notificador.exito('Telefono creado correctamente.');
              }

              modal.cerrar();
              await cargar();
            } catch (error) {
              modal.establecerCargando(false);

              if (error.esValidacion) {
                formulario.mostrarErroresServidor(error);
              } else {
                notificador.desdeErrorApi(error);
              }
            }
          }
        }
      ]
    });

    modal.abrir();
    formulario.enfocarPrimero();
  }

  function confirmarBorrado(telefono) {
    const modal = ModalConfirmacion({
      titulo: 'Eliminar este telefono?',
      mensaje:
        `Se ejecutara DELETE /api/telefonos/${telefono.id} (${telefono.numeroTelefono}). ` +
        'TELEFONO es una tabla hoja: nadie depende de ella, asi que el borrado es directo.',
      onConfirmar: async () => {
        try {
          await telefonoServicio.eliminar(telefono.id);
          notificador.exito('Telefono eliminado correctamente.');
          await cargar();
        } catch (error) {
          notificador.desdeErrorApi(error);
          throw error;
        }
      }
    });

    modal.abrir();
  }

  return { cargar };
}
