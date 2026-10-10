/**
 * js/paginas/paginaRedesSociales.js
 * ---------------------------------------------------------------------
 * PAGINA: Catalogo de redes sociales
 *
 * LO QUE ESTA PAGINA ENSENA: LA PROTECCION AL BORRAR.
 *
 * RED_SOCIAL es una tabla PADRE de PERFIL_SOCIAL. Si borraramos
 * "Instagram" mientras tres usuarios tienen perfiles ahi, esos
 * perfiles quedarian apuntando a un id que ya no existe: serian
 * datos huerfanos.
 *
 * La API lo impide: antes del DELETE cuenta los perfiles asociados y,
 * si hay alguno, responde 409 Conflict con un mensaje que dice
 * exactamente cuantos son. Esta pagina muestra ese mensaje.
 *
 * Es el ejemplo mas claro de por que la INTEGRIDAD REFERENCIAL se
 * valida en el servidor y no en el navegador: el frontend no tiene
 * forma de garantizar que entre el momento de pintar la tabla y el
 * clic en "eliminar" nadie haya creado un perfil nuevo.
 */

import { CabeceraPagina } from '../plantillas/panelAdministracion.js';
import { TablaDatos, CeldaEnlace } from '../organismos/tablaDatos.js';
import { Modal, ModalConfirmacion } from '../organismos/modal.js';
import { Formulario } from '../organismos/formulario.js';
import { BarraBusqueda } from '../moleculas/barraBusqueda.js';
import { Paginador } from '../moleculas/paginador.js';
import { EstadoVacio, EstadoError } from '../moleculas/estadoVacio.js';
import { notificador } from '../moleculas/notificacion.js';
import { Boton } from '../atomos/boton.js';
import { Insignia } from '../atomos/insignia.js';
import { CargadorBloque } from '../atomos/cargador.js';

import { redSocialServicio } from '../servicios/redSocial.servicio.js';

import { validarTexto, validarURL } from '../utiles/validadores.js';
import { urlCompacta } from '../utiles/formato.js';
import { CONFIGURACION } from '../config/configuracion.js';

export function PaginaRedesSociales({ onContenido, onTotalCambiado = null } = {}) {
  let filtros = { pagina: 1, limite: CONFIGURACION.limitePorPagina };
  let ultimaRespuesta = { redesSociales: [], meta: null };

  const barraBusqueda = BarraBusqueda({
    sugerencia: 'Buscar por nombre o URL...',
    onCambio: (valores) => {
      filtros = { ...valores, pagina: 1, limite: filtros.limite };
      cargar();
    },
    onRecargar: () => cargar()
  });

  async function cargar() {
    pintar(CargadorBloque({ mensaje: 'Consultando el catalogo de redes sociales...' }));

    try {
      ultimaRespuesta = await redSocialServicio.listar(filtros);

      if (onTotalCambiado !== null) {
        onTotalCambiado(ultimaRespuesta.meta?.total ?? 0);
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
        titulo: 'Redes sociales',
        descripcion:
          'Tabla de CATALOGO (o tabla maestra): guarda una lista cerrada de valores que el ' +
          'resto del sistema reutiliza. No se puede eliminar una red que tenga perfiles asociados.',
        accion: Boton({
          texto: 'Nueva red social',
          variante: 'primario',
          icono: 'agregar',
          onClick: () => abrirFormulario(null)
        })
      }),
      barraBusqueda.elemento,
      ...nodos
    );
  }

  function pintarTabla() {
    const { redesSociales, meta } = ultimaRespuesta;

    if (redesSociales.length === 0) {
      const hayFiltros = Boolean(filtros.buscar);

      pintar(
        EstadoVacio({
          titulo: hayFiltros ? 'Sin resultados' : 'No hay redes sociales',
          mensaje: hayFiltros
            ? 'Ninguna red social coincide con la busqueda.'
            : 'Crea la primera red social. Luego podras asignar perfiles a los usuarios.',
          icono: hayFiltros ? 'buscar' : 'redSocial',
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
            : {
                texto: 'Crear la primera red social',
                onClick: () => abrirFormulario(null)
              }
        })
      );
      return;
    }

    pintar(
      TablaDatos({
        titulo: 'Redes sociales',
        columnas: [
          { etiqueta: 'Id', clase: 'id', obtener: (red) => String(red.id) },
          { etiqueta: 'Nombre', clase: 'principal', obtener: (red) => red.nombre },
          {
            etiqueta: 'URL',
            obtener: (red) => CeldaEnlace(red.url, urlCompacta(red.url)),
            titulo: (red) => red.url
          },
          {
            etiqueta: 'Dominio',
            obtener: (red) =>
              red.dominio
                ? Insignia({ texto: red.dominio, variante: 'terciaria', mono: true })
                : '—'
          }
        ],
        filas: redesSociales,
        claveFila: (red) => String(red.id),
        acciones: (red) => [
          {
            icono: 'editar',
            etiqueta: `Editar ${red.nombre}`,
            onClick: () => abrirFormulario(red)
          },
          {
            icono: 'eliminar',
            etiqueta: `Eliminar ${red.nombre}`,
            onClick: () => confirmarBorrado(red)
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

  function abrirFormulario(red) {
    const esEdicion = red !== null;

    const formulario = Formulario({
      nota:
        `El modelo define url como VARCHAR(45), asi que la URL no puede pasar de ` +
        `${CONFIGURACION.longitudMaximaTexto} caracteres. La API tambien rechaza nombres ` +
        'repetidos (comparando sin distinguir mayusculas) con un 409 Conflict.',
      grupos: [
        {
          campos: [
            {
              id: 'red-nombre',
              nombre: 'nombre',
              etiqueta: 'Nombre de la red social',
              valor: red?.nombre ?? '',
              requerido: true,
              maximo: CONFIGURACION.longitudMaximaTexto,
              sugerencia: 'Instagram',
              validar: (valor) =>
                validarTexto(valor, { etiqueta: 'El nombre de la red social' })
            },
            {
              id: 'red-url',
              nombre: 'url',
              etiqueta: 'URL base',
              tipo: 'url',
              valor: red?.url ?? '',
              requerido: true,
              maximo: CONFIGURACION.longitudMaximaTexto,
              sugerencia: 'https://www.instagram.com',
              ayuda: `Debe empezar con http:// o https://. Maximo ${CONFIGURACION.longitudMaximaTexto} caracteres.`,
              validar: (valor) => validarURL(valor, { etiqueta: 'La URL base' })
            }
          ]
        }
      ]
    });

    const modal = Modal({
      titulo: esEdicion ? `Editar la red social ${red.id}` : 'Nueva red social',
      descripcion: esEdicion
        ? `PUT /api/redes-sociales/${red.id}`
        : 'POST /api/redes-sociales',
      cuerpo: formulario.elemento,
      acciones: [
        { texto: 'Cancelar', variante: 'texto', onClick: () => modal.cerrar() },
        {
          texto: esEdicion ? 'Guardar cambios' : 'Crear red social',
          variante: 'primario',
          icono: 'guardar',
          onClick: async () => {
            if (!formulario.validar()) return;

            modal.establecerCargando(true);

            try {
              const datos = formulario.obtenerDatos();

              if (esEdicion) {
                await redSocialServicio.actualizar(red.id, datos);
                notificador.exito('Red social actualizada correctamente.');
              } else {
                const creada = await redSocialServicio.crear(datos);
                notificador.exito(
                  `Red social "${creada.nombre}" creada con id ${creada.id}.`
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

  /**
   * Confirma y borra una red social.
   *
   * Aviso explicito de que el servidor puede rechazar la operacion.
   * Es honesto con el usuario: le decimos la regla ANTES de que la
   * descubra con un error.
   */
  function confirmarBorrado(red) {
    const modal = ModalConfirmacion({
      titulo: `Eliminar la red social "${red.nombre}"?`,
      mensaje:
        `Se ejecutara DELETE /api/redes-sociales/${red.id}. ` +
        'Si algun usuario tiene un perfil en esta red, la API respondera 409 Conflict ' +
        'y no se borrara nada: eso protege la integridad referencial.',
      onConfirmar: async () => {
        try {
          await redSocialServicio.eliminar(red.id);
          notificador.exito(`Red social "${red.nombre}" eliminada correctamente.`);
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
