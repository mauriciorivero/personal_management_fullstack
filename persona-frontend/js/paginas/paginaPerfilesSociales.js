/**
 * js/paginas/paginaPerfilesSociales.js
 * ---------------------------------------------------------------------
 * PAGINA: Perfiles sociales (la tabla puente N:N)
 *
 * ESTA ES LA PAGINA MAS IMPORTANTE DEL CURSO, porque muestra en la
 * practica el concepto que mas cuesta entender del modelo relacional:
 * LA TABLA PUENTE CON LLAVE PRIMARIA COMPUESTA.
 *
 * EL PROBLEMA
 * Un usuario puede estar en muchas redes sociales. Una red social
 * tiene muchos usuarios. Eso es una relacion de MUCHOS A MUCHOS, y
 * las bases de datos relacionales NO la pueden representar directo.
 *
 * LA SOLUCION
 * Se parte en dos relaciones 1:N con una tabla intermedia:
 *
 *     USUARIO  1 --- N  PERFIL_SOCIAL  N --- 1  RED_SOCIAL
 *
 * Y la llave primaria de esa tabla intermedia son LAS DOS llaves
 * foraneas juntas:
 *
 *     PRIMARY KEY (RED_SOCIAL_id, USUARIO_id)
 *
 * LAS CUATRO CONSECUENCIAS QUE SE VEN EN ESTA PANTALLA
 *   1. No hay columna "id": la identidad son dos valores.
 *   2. La URL del recurso lleva dos segmentos:
 *        GET /api/perfiles-sociales/4/3
 *   3. MySQL impide que un usuario tenga dos perfiles en la misma
 *      red. No es nuestro codigo: es la base de datos, que es mucho
 *      mas confiable.
 *   4. La llave NO se puede editar. Cambiarla no es "actualizar", es
 *      borrar un recurso y crear otro distinto.
 */

import { crear } from '../utiles/dom.js';
import { CabeceraPagina } from '../plantillas/panelAdministracion.js';
import { TablaDatos, CeldaDoble, CeldaEnlace } from '../organismos/tablaDatos.js';
import { Modal, ModalConfirmacion } from '../organismos/modal.js';
import { Formulario } from '../organismos/formulario.js';
import { Paginador } from '../moleculas/paginador.js';
import { EstadoVacio, EstadoError } from '../moleculas/estadoVacio.js';
import { notificador } from '../moleculas/notificacion.js';
import { Boton } from '../atomos/boton.js';
import { CargadorBloque } from '../atomos/cargador.js';

import { perfilSocialServicio } from '../servicios/perfilSocial.servicio.js';
import { redSocialServicio } from '../servicios/redSocial.servicio.js';
import { usuarioServicio } from '../servicios/usuario.servicio.js';

import { validarURL } from '../utiles/validadores.js';
import { urlCompacta } from '../utiles/formato.js';
import { CONFIGURACION } from '../config/configuracion.js';

export function PaginaPerfilesSociales({ onContenido, onTotalCambiado = null } = {}) {
  let filtros = { pagina: 1, limite: CONFIGURACION.limitePorPagina };
  let ultimaRespuesta = { perfilesSociales: [], meta: null };
  let mapaUsuarios = new Map();

  async function cargarMapaUsuarios() {
    const { usuarios } = await usuarioServicio.listar({ limite: 200 });
    mapaUsuarios = new Map(usuarios.map((usuario) => [usuario.id, usuario]));
  }

  async function cargar() {
    pintar(CargadorBloque({ mensaje: 'Consultando perfiles sociales...' }));

    try {
      const [respuesta] = await Promise.all([
        perfilSocialServicio.listar(filtros),
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
        titulo: 'Perfiles sociales',
        descripcion:
          'Tabla PUENTE de la relacion N a N entre USUARIO y RED_SOCIAL. Su llave primaria ' +
          'es COMPUESTA: (RED_SOCIAL_id, USUARIO_id). Por eso la URL del recurso lleva dos ' +
          'segmentos y un usuario no puede tener dos perfiles en la misma red.',
        accion: Boton({
          texto: 'Nuevo perfil social',
          variante: 'primario',
          icono: 'agregar',
          onClick: () => abrirFormulario(null)
        })
      }),
      ...nodos
    );
  }

  function nombreUsuario(usuarioId) {
    return mapaUsuarios.get(usuarioId)?.nombreCompleto ?? `Usuario ${usuarioId}`;
  }

  /** Pinta la llave compuesta con formato monoespaciado. */
  function celdaLlave(perfil) {
    return crear(
      'span',
      {
        clase: 'p-recursos__llave-compuesta',
        title: `RED_SOCIAL_id = ${perfil.redSocialId}, USUARIO_id = ${perfil.usuarioId}`
      },
      String(perfil.redSocialId),
      crear('span', { clase: 'p-recursos__llave-separador', texto: ':' }),
      String(perfil.usuarioId)
    );
  }

  function pintarTabla() {
    const { perfilesSociales, meta } = ultimaRespuesta;

    if (perfilesSociales.length === 0) {
      pintar(
        EstadoVacio({
          titulo: 'No hay perfiles sociales',
          mensaje:
            'Un perfil social une un usuario con una red social. Necesitas al menos un ' +
            'usuario y una red social creados.',
          icono: 'perfilSocial',
          accion: {
            texto: 'Crear el primer perfil',
            onClick: () => abrirFormulario(null)
          }
        })
      );
      return;
    }

    pintar(
      TablaDatos({
        titulo: 'Perfiles sociales',
        columnas: [
          {
            etiqueta: 'Llave compuesta',
            clase: 'id',
            obtener: celdaLlave
          },
          {
            etiqueta: 'Red social',
            clase: 'principal',
            obtener: (perfil) =>
              CeldaDoble(
                // El nombre viene del INNER JOIN que hace el service.
                perfil.redSocial?.nombre ?? `Red ${perfil.redSocialId}`,
                `RED_SOCIAL_id ${perfil.redSocialId}`
              )
          },
          {
            etiqueta: 'Usuario',
            obtener: (perfil) =>
              CeldaDoble(nombreUsuario(perfil.usuarioId), `USUARIO_id ${perfil.usuarioId}`)
          },
          {
            etiqueta: 'URL del perfil',
            obtener: (perfil) =>
              perfil.urlPerfil
                ? CeldaEnlace(perfil.urlPerfil, urlCompacta(perfil.urlPerfil))
                : '—',
            titulo: (perfil) => perfil.urlPerfil
          },
          {
            etiqueta: 'Usuario del perfil',
            obtener: (perfil) => perfil.nombreUsuarioPerfil ?? '—'
          }
        ],
        filas: perfilesSociales,

        // La clave de la fila tambien es compuesta.
        claveFila: (perfil) => `${perfil.redSocialId}-${perfil.usuarioId}`,

        acciones: (perfil) => [
          {
            icono: 'editar',
            etiqueta: 'Editar la URL del perfil',
            onClick: () => abrirFormulario(perfil)
          },
          {
            icono: 'eliminar',
            etiqueta: 'Eliminar el perfil social',
            onClick: () => confirmarBorrado(perfil)
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

  async function abrirFormulario(perfil) {
    const esEdicion = perfil !== null;

    // Necesitamos los dos catalogos para las dos mitades de la llave.
    let catalogoRedes = [];

    try {
      const [redes] = await Promise.all([
        redSocialServicio.obtenerCatalogo(),
        mapaUsuarios.size === 0 ? cargarMapaUsuarios() : Promise.resolve()
      ]);
      catalogoRedes = redes;
    } catch (error) {
      notificador.desdeErrorApi(error);
      return;
    }

    // PREVENIR EL ERROR: sin las dos tablas padre no hay llave
    // compuesta posible. Lo explicamos antes de que falle el servidor.
    if (catalogoRedes.length === 0 || mapaUsuarios.size === 0) {
      const faltantes = [];
      if (mapaUsuarios.size === 0) faltantes.push('un usuario');
      if (catalogoRedes.length === 0) faltantes.push('una red social');

      notificador.advertencia(
        `Un perfil social necesita las dos llaves foraneas. Primero crea ${faltantes.join(' y ')}.`
      );
      return;
    }

    const formulario = Formulario({
      nota: esEdicion
        ? 'La llave compuesta (redSocialId, usuarioId) identifica el recurso y NO se puede ' +
          'cambiar: solo se edita urlPerfil. Para moverlo a otra red, elimina este perfil y crea uno nuevo.'
        : 'POST /api/perfiles-sociales · si la combinacion ya existe, la PRIMARY KEY de MySQL ' +
          'lo impide y la API responde 409 Conflict.',
      grupos: [
        {
          leyenda: esEdicion ? 'Llave compuesta (no editable)' : 'Llave compuesta',
          campos: [
            {
              id: 'perfil-red',
              nombre: 'redSocialId',
              etiqueta: 'Red social (RED_SOCIAL_id)',
              control: 'seleccion',
              valor: String(perfil?.redSocialId ?? ''),
              requerido: !esEdicion,
              deshabilitado: esEdicion,
              textoVacio: 'Selecciona una red social',
              opciones: catalogoRedes.map((red) => ({
                valor: red.id,
                texto: `${red.nombre} (id ${red.id})`
              })),
              validar: esEdicion
                ? null
                : (valor) => (valor === '' ? 'Debes elegir una red social.' : null)
            },
            {
              id: 'perfil-usuario',
              nombre: 'usuarioId',
              etiqueta: 'Usuario (USUARIO_id)',
              control: 'seleccion',
              valor: String(perfil?.usuarioId ?? ''),
              requerido: !esEdicion,
              deshabilitado: esEdicion,
              textoVacio: 'Selecciona un usuario',
              opciones: Array.from(mapaUsuarios.values()).map((usuario) => ({
                valor: usuario.id,
                texto: `${usuario.nombreCompleto} (id ${usuario.id})`
              })),
              validar: esEdicion
                ? null
                : (valor) => (valor === '' ? 'Debes elegir un usuario.' : null)
            }
          ]
        },
        {
          leyenda: 'Datos del perfil',
          campos: [
            {
              id: 'perfil-url-perfil',
              nombre: 'urlPerfil',
              etiqueta: 'URL del perfil',
              tipo: 'url',
              valor: perfil?.urlPerfil ?? '',
              maximo: CONFIGURACION.longitudMaximaTexto,
              anchoCompleto: true,
              sugerencia: 'https://www.instagram.com/usuario',
              ayuda: `Opcional (la columna admite NULL). Maximo ${CONFIGURACION.longitudMaximaTexto} caracteres.`,
              validar: (valor) =>
                validarURL(valor, { etiqueta: 'La URL del perfil', requerido: false })
            }
          ]
        }
      ]
    });

    const modal = Modal({
      titulo: esEdicion
        ? `Editar el perfil ${perfil.redSocialId}:${perfil.usuarioId}`
        : 'Nuevo perfil social',
      descripcion: esEdicion
        ? `PUT /api/perfiles-sociales/${perfil.redSocialId}/${perfil.usuarioId}`
        : 'POST /api/perfiles-sociales',
      cuerpo: formulario.elemento,
      acciones: [
        { texto: 'Cancelar', variante: 'texto', onClick: () => modal.cerrar() },
        {
          texto: esEdicion ? 'Guardar cambios' : 'Crear perfil',
          variante: 'primario',
          icono: 'guardar',
          onClick: async () => {
            if (!formulario.validar()) return;

            modal.establecerCargando(true);

            try {
              const datos = formulario.obtenerDatos();

              if (esEdicion) {
                // Solo mandamos urlPerfil: la llave es inmutable.
                await perfilSocialServicio.actualizar(
                  perfil.redSocialId,
                  perfil.usuarioId,
                  { urlPerfil: datos.urlPerfil ?? '' }
                );
                notificador.exito('Perfil social actualizado correctamente.');
              } else {
                const creado = await perfilSocialServicio.crear(datos);
                notificador.exito(
                  `Perfil social creado con la llave ${creado.redSocialId}:${creado.usuarioId}.`
                );
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

  function confirmarBorrado(perfil) {
    const modal = ModalConfirmacion({
      titulo: 'Eliminar este perfil social?',
      mensaje:
        `Se ejecutara DELETE /api/perfiles-sociales/${perfil.redSocialId}/${perfil.usuarioId}. ` +
        'Los dos valores de la URL forman la llave primaria compuesta. PERFIL_SOCIAL es una ' +
        'tabla hoja, asi que el borrado es directo.',
      onConfirmar: async () => {
        try {
          await perfilSocialServicio.eliminar(perfil.redSocialId, perfil.usuarioId);
          notificador.exito('Perfil social eliminado correctamente.');
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
