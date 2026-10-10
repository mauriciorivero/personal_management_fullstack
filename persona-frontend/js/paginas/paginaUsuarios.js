/**
 * js/paginas/paginaUsuarios.js
 * ---------------------------------------------------------------------
 * PAGINA: Gestion de usuarios
 *
 * ATOMIC DESIGN - NIVEL 5: PAGINAS
 * Una pagina es una plantilla con CONTENIDO REAL. Es el unico nivel
 * que tiene permiso para:
 *   - llamar a los servicios (y por lo tanto a la API);
 *   - guardar estado (que pagina, que filtros, que usuario se edita);
 *   - orquestar los organismos entre si.
 *
 * Los niveles de abajo (atomos, moleculas, organismos) son "tontos" a
 * proposito: reciben datos y manejadores, y no saben de donde vienen.
 * Esa es justamente la razon por la que se pueden reutilizar.
 *
 * EL CICLO COMPLETO DE UN CRUD EN ESTA PAGINA
 * ---------------------------------------------------------------------
 *   1. cargar()          -> GET,  pinta la tabla
 *   2. abrirFormulario() -> abre el modal (crear o editar)
 *   3. guardar()         -> POST o PUT, notifica y recarga
 *   4. confirmarBorrado()-> DELETE con confirmacion previa
 *
 * LOS CUATRO ESTADOS DE LA VISTA, que siempre hay que manejar:
 *   cargando / vacio / error / con datos
 */

import { crear } from '../utiles/dom.js';
import { CabeceraPagina } from '../plantillas/panelAdministracion.js';
import { TablaDatos, CeldaDoble } from '../organismos/tablaDatos.js';
import { Modal, ModalConfirmacion } from '../organismos/modal.js';
import { Formulario } from '../organismos/formulario.js';
import { PanelDetalleUsuario } from '../organismos/panelDetalleUsuario.js';
import { BarraBusqueda } from '../moleculas/barraBusqueda.js';
import { Paginador } from '../moleculas/paginador.js';
import { EstadoVacio, EstadoError } from '../moleculas/estadoVacio.js';
import { notificador } from '../moleculas/notificacion.js';
import { Boton } from '../atomos/boton.js';
import { Insignia, InsigniaEstado } from '../atomos/insignia.js';
import { CargadorBloque } from '../atomos/cargador.js';

import { usuarioServicio } from '../servicios/usuario.servicio.js';
import { telefonoServicio } from '../servicios/telefono.servicio.js';
import { redSocialServicio } from '../servicios/redSocial.servicio.js';
import { perfilSocialServicio } from '../servicios/perfilSocial.servicio.js';

import { fechaCorta, numero } from '../utiles/formato.js';
import {
  validarTexto,
  validarFecha,
  validarTelefono,
  validarURL,
  validarOpcion,
  calcularEdad
} from '../utiles/validadores.js';
import { CONFIGURACION } from '../config/configuracion.js';

/**
 * @param {object} propiedades
 * @param {function} propiedades.onContenido  Recibe los nodos a mostrar.
 * @param {function} propiedades.onTotalCambiado  Avisa el total, para el menu.
 */
export function PaginaUsuarios({ onContenido, onTotalCambiado = null } = {}) {
  // =====================================================================
  // ESTADO DE LA PAGINA
  // ---------------------------------------------------------------------
  // Son variables del closure: viven mientras la pagina exista y no
  // contaminan el ambito global. Es el equivalente de los atributos
  // privados de una clase.
  // =====================================================================
  let filtros = { pagina: 1, limite: CONFIGURACION.limitePorPagina };
  let ultimaRespuesta = { usuarios: [], meta: null };

  // La barra de busqueda se crea UNA sola vez, fuera de la funcion de
  // pintado. Si la recrearamos en cada render, el campo perderia el
  // foco y el texto a medio escribir en cada pulsacion de tecla. Es
  // un bug muy comun al renderizar de nuevo toda la vista.
  const barraBusqueda = BarraBusqueda({
    sugerencia: 'Buscar por nombre o apellido...',
    filtros: [
      {
        id: 'filtro-estado',
        nombre: 'estado',
        etiqueta: 'Filtrar por estado',
        opciones: [
          { valor: '1', texto: 'Activos' },
          { valor: '0', texto: 'Inactivos' }
        ],
        textoVacio: 'Todo estado'
      }
    ],
    onCambio: (valores) => {
      // Al cambiar un filtro, volvemos a la pagina 1. Si no, el
      // usuario podria quedar en la pagina 5 de un resultado que solo
      // tiene 2 paginas y ver la lista vacia sin entender por que.
      filtros = { ...valores, pagina: 1, limite: filtros.limite };
      cargar();
    },
    onRecargar: () => cargar()
  });

  // =====================================================================
  // CARGA DE DATOS
  // =====================================================================

  /** Pide los usuarios a la API y pinta el resultado. */
  async function cargar() {
    // ---- ESTADO 1: CARGANDO ----
    pintar(CargadorBloque({ mensaje: 'Consultando usuarios en la API...' }));

    try {
      ultimaRespuesta = await usuarioServicio.listar(filtros);

      if (onTotalCambiado !== null) {
        onTotalCambiado(ultimaRespuesta.meta?.total ?? 0);
      }

      pintarTabla();
    } catch (error) {
      // ---- ESTADO 3: ERROR ----
      pintar(EstadoError({ error, onReintentar: cargar }));
      notificador.desdeErrorApi(error);
    }
  }

  /** Envia los nodos a la plantilla, junto con la cabecera y la barra. */
  function pintar(...nodos) {
    onContenido(
      CabeceraPagina({
        titulo: 'Usuarios',
        descripcion:
          'Cada usuario corresponde a una fila de la tabla USUARIO. Al eliminarlo, ' +
          'la API borra tambien sus telefonos y perfiles sociales dentro de una transaccion.',
        accion: Boton({
          texto: 'Nuevo usuario',
          variante: 'primario',
          icono: 'agregar',
          onClick: () => abrirFormulario(null)
        })
      }),
      barraBusqueda.elemento,
      ...nodos
    );
  }

  /** Pinta la tabla o el estado vacio. */
  function pintarTabla() {
    const { usuarios, meta } = ultimaRespuesta;

    // ---- ESTADO 2: VACIO ----
    if (usuarios.length === 0) {
      // Distinguimos "no hay nada" de "la busqueda no encontro nada".
      // Son situaciones distintas y necesitan mensajes distintos.
      const hayFiltros = Boolean(filtros.buscar || filtros.estado);

      pintar(
        EstadoVacio({
          titulo: hayFiltros ? 'Sin resultados' : 'No hay usuarios registrados',
          mensaje: hayFiltros
            ? 'Ningun usuario coincide con los filtros aplicados. Prueba a limpiarlos.'
            : 'Crea el primer usuario para empezar a usar la aplicacion.',
          icono: hayFiltros ? 'buscar' : 'usuarios',
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
                texto: 'Crear el primer usuario',
                onClick: () => abrirFormulario(null)
              }
        })
      );
      return;
    }

    // ---- ESTADO 4: CON DATOS ----
    pintar(
      TablaDatos({
        titulo: 'Usuarios',
        columnas: [
          {
            etiqueta: 'Id',
            clase: 'id',
            obtener: (usuario) => String(usuario.id)
          },
          {
            etiqueta: 'Nombre completo',
            clase: 'principal',
            obtener: (usuario) =>
              CeldaDoble(usuario.nombreCompleto, usuario.ciudadDomicilio)
          },
          {
            etiqueta: 'Nacimiento',
            obtener: (usuario) => fechaCorta(usuario.fechaNacimiento)
          },
          {
            etiqueta: 'Edad',
            clase: 'numero',
            obtener: (usuario) => String(usuario.edad)
          },
          {
            // El listado NO trae los arreglos de telefonos ni de
            // perfiles: seria carisimo. Trae los CONTEOS, que la API
            // calcula con subconsultas correlacionadas en la misma
            // consulta (ver #columnasSelectListado del service).
            etiqueta: 'Telefonos',
            clase: 'numero',
            obtener: (usuario) =>
              Insignia({
                texto: String(usuario.totalTelefonos ?? 0),
                variante: 'primaria'
              })
          },
          {
            etiqueta: 'Perfiles',
            clase: 'numero',
            obtener: (usuario) =>
              Insignia({
                texto: String(usuario.totalPerfilesSociales ?? 0),
                variante: 'terciaria'
              })
          },
          {
            etiqueta: 'Estado',
            obtener: (usuario) => InsigniaEstado(usuario.estado)
          }
        ],
        filas: ultimaRespuesta.usuarios,
        claveFila: (usuario) => String(usuario.id),
        onClicFila: (usuario) => abrirDetalle(usuario.id),
        acciones: (usuario) => [
          {
            icono: 'ver',
            etiqueta: `Ver el detalle de ${usuario.nombreCompleto}`,
            onClick: () => abrirDetalle(usuario.id)
          },
          {
            icono: 'editar',
            etiqueta: `Editar a ${usuario.nombreCompleto}`,
            onClick: () => abrirFormulario(usuario)
          },
          {
            icono: 'eliminar',
            etiqueta: `Eliminar a ${usuario.nombreCompleto}`,
            onClick: () => confirmarBorrado(usuario)
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

  // =====================================================================
  // FORMULARIO DE CREAR / EDITAR
  // =====================================================================

  /**
   * Abre el modal del formulario.
   *
   * @param {object|null} usuario  null para crear, el objeto para editar.
   */
  function abrirFormulario(usuario) {
    const esEdicion = usuario !== null;

    // Campo calculado: muestra la edad en vivo mientras se escribe la
    // fecha. Es informativo; el valor real lo calcula el servidor.
    const valorEdad = crear('strong', {
      texto: esEdicion ? String(usuario.edad) : '—'
    });

    const campoEdad = crear(
      'div',
      { clase: 'm-campo-formulario' },
      crear('span', { clase: 'a-etiqueta', texto: 'Edad (calculada)' }),
      crear(
        'div',
        { clase: 'o-formulario__calculado' },
        valorEdad,
        crear('span', { texto: 'anios' })
      ),
      crear('p', {
        clase: 'm-campo-formulario__ayuda',
        texto: 'No se envia a la API: el servidor la recalcula desde la fecha de nacimiento.'
      })
    );

    // Fecha de hoy en formato ISO, para el atributo max del calendario.
    const hoy = new Date();
    const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    const formulario = Formulario({
      nota:
        'La edad NO se envia: la calcula el servidor a partir de la fecha de nacimiento ' +
        '(utils/fechas.js). Asi la columna edad nunca queda desincronizada.',
      grupos: [
        {
          leyenda: 'Datos personales',
          campos: [
            {
              id: 'usuario-primer-nombre',
              nombre: 'primerNombre',
              etiqueta: 'Primer nombre',
              valor: usuario?.primerNombre ?? '',
              requerido: true,
              maximo: CONFIGURACION.longitudMaximaTexto,
              autocompletar: 'given-name',
              validar: (valor) =>
                validarTexto(valor, {
                  etiqueta: 'El primer nombre',
                  soloLetras: true
                })
            },
            {
              id: 'usuario-segundo-nombre',
              nombre: 'segundoNombre',
              etiqueta: 'Segundo nombre',
              valor: usuario?.segundoNombre ?? '',
              maximo: CONFIGURACION.longitudMaximaTexto,
              ayuda: 'Opcional (la columna admite NULL).',
              validar: (valor) =>
                validarTexto(valor, {
                  etiqueta: 'El segundo nombre',
                  requerido: false,
                  soloLetras: true
                })
            },
            {
              id: 'usuario-primer-apellido',
              nombre: 'primerApellido',
              etiqueta: 'Primer apellido',
              valor: usuario?.primerApellido ?? '',
              requerido: true,
              maximo: CONFIGURACION.longitudMaximaTexto,
              autocompletar: 'family-name',
              validar: (valor) =>
                validarTexto(valor, {
                  etiqueta: 'El primer apellido',
                  soloLetras: true
                })
            },
            {
              id: 'usuario-segundo-apellido',
              nombre: 'segundoApellido',
              etiqueta: 'Segundo apellido',
              valor: usuario?.segundoApellido ?? '',
              maximo: CONFIGURACION.longitudMaximaTexto,
              ayuda: 'Opcional (la columna admite NULL).',
              validar: (valor) =>
                validarTexto(valor, {
                  etiqueta: 'El segundo apellido',
                  requerido: false,
                  soloLetras: true
                })
            }
          ]
        },
        {
          leyenda: 'Nacimiento y residencia',
          campos: [
            {
              id: 'usuario-fecha-nacimiento',
              nombre: 'fechaNacimiento',
              etiqueta: 'Fecha de nacimiento',
              tipo: 'date',
              valor: usuario?.fechaNacimiento ?? '',
              requerido: true,

              // max = hoy: el calendario no deja elegir el futuro.
              maximoValor: hoyISO,

              ayuda: 'Formato AAAA-MM-DD. No puede ser una fecha futura.',

              // Al escribir la fecha, actualizamos la edad en vivo.
              onInput: (evento) => {
                const edad = calcularEdad(evento.target.value);
                valorEdad.textContent = edad === null ? '—' : String(edad);
              },

              validar: (valor) =>
                validarFecha(valor, { etiqueta: 'La fecha de nacimiento' })
            },
            { elementoPersonalizado: campoEdad },
            {
              id: 'usuario-ciudad',
              nombre: 'ciudadDomicilio',
              etiqueta: 'Ciudad de domicilio',
              valor: usuario?.ciudadDomicilio ?? '',
              requerido: true,
              maximo: CONFIGURACION.longitudMaximaTexto,
              autocompletar: 'address-level2',
              validar: (valor) =>
                validarTexto(valor, {
                  etiqueta: 'La ciudad de domicilio',
                  soloLetras: true
                })
            },
            {
              id: 'usuario-estado',
              nombre: 'estado',
              etiqueta: 'Estado',
              control: 'seleccion',
              valor: String(usuario?.estado ?? 1),
              opciones: [
                { valor: '1', texto: 'Activo' },
                { valor: '0', texto: 'Inactivo' }
              ],
              ayuda: 'Columna estado: 1 activo, 0 inactivo.'
            }
          ]
        }
      ]
    });

    const modal = Modal({
      titulo: esEdicion ? `Editar usuario ${usuario.id}` : 'Nuevo usuario',
      descripcion: esEdicion
        ? 'PUT /api/usuarios/' + usuario.id + ' · solo se envian los campos modificados.'
        : 'POST /api/usuarios',
      cuerpo: formulario.elemento,
      acciones: [
        { texto: 'Cancelar', variante: 'texto', onClick: () => modal.cerrar() },
        {
          texto: esEdicion ? 'Guardar cambios' : 'Crear usuario',
          variante: 'primario',
          icono: 'guardar',
          onClick: () => guardar({ modal, formulario, usuario })
        }
      ]
    });

    modal.abrir();

    // Enfocamos el primer campo para que el usuario pueda escribir de
    // inmediato, sin tener que hacer clic.
    formulario.enfocarPrimero();
  }

  /**
   * Envia el formulario a la API.
   *
   * Observa el orden de los pasos: validacion local, deshabilitar
   * botones, peticion, y manejo diferenciado del error.
   */
  async function guardar({ modal, formulario, usuario }) {
    // 1. Validacion LOCAL. Si falla, no gastamos una peticion.
    if (!formulario.validar()) {
      return;
    }

    const datos = formulario.obtenerDatos();

    // 2. Bloqueamos los botones: evita el doble envio por doble clic.
    modal.establecerCargando(true);

    try {
      if (usuario !== null) {
        await usuarioServicio.actualizar(usuario.id, datos);
        notificador.exito(`Usuario ${usuario.id} actualizado correctamente.`);
      } else {
        const creado = await usuarioServicio.crear(datos);
        notificador.exito(
          `Usuario "${creado.nombreCompleto}" creado con id ${creado.id}. ` +
            `El servidor calculo su edad: ${creado.edad} anios.`
        );
      }

      modal.cerrar();

      // 3. Recargamos para ver el estado real guardado en la base.
      await cargar();
    } catch (error) {
      modal.establecerCargando(false);

      // Si la API devolvio errores de campo, los pintamos EN el
      // formulario, junto a cada campo. Para cualquier otro error,
      // una notificacion basta.
      if (error.esValidacion) {
        formulario.mostrarErroresServidor(error);
      } else {
        notificador.desdeErrorApi(error);
      }
    }
  }

  // =====================================================================
  // BORRADO
  // =====================================================================

  /**
   * Pide confirmacion y elimina el usuario.
   *
   * El mensaje avisa de las CONSECUENCIAS: cuantos telefonos y
   * perfiles se van a borrar en cascada. Un dialogo que solo dice
   * "Seguro?" no le da al usuario informacion para decidir.
   */
  function confirmarBorrado(usuario) {
    const totalTelefonos = usuario.totalTelefonos ?? 0;
    const totalPerfiles = usuario.totalPerfilesSociales ?? 0;

    const consecuencias = [];
    if (totalTelefonos > 0) {
      consecuencias.push(`${totalTelefonos} telefono(s)`);
    }
    if (totalPerfiles > 0) {
      consecuencias.push(`${totalPerfiles} perfil(es) social(es)`);
    }

    const detalle =
      consecuencias.length > 0
        ? ` La API tambien eliminara, dentro de una transaccion, ${consecuencias.join(' y ')}.`
        : '';

    const modal = ModalConfirmacion({
      titulo: `Eliminar a ${usuario.nombreCompleto}?`,
      mensaje:
        `Se ejecutara DELETE /api/usuarios/${usuario.id}.${detalle} ` +
        'Esta accion no se puede deshacer.',
      textoConfirmar: 'Si, eliminar',
      onConfirmar: async () => {
        try {
          const resumen = await usuarioServicio.eliminar(usuario.id);

          notificador.exito(
            `Usuario "${resumen.nombreCompleto}" eliminado. ` +
              `Telefonos borrados: ${resumen.telefonosEliminados}. ` +
              `Perfiles borrados: ${resumen.perfilesEliminados}.`
          );

          await cargar();
        } catch (error) {
          notificador.desdeErrorApi(error);
          throw error;
        }
      }
    });

    modal.abrir();
  }

  // =====================================================================
  // DETALLE (con telefonos y perfiles sociales)
  // =====================================================================

  /** Abre el modal de detalle de un usuario. */
  async function abrirDetalle(id) {
    const contenedor = crear('div', {}, CargadorBloque({ mensaje: 'Cargando el detalle...' }));

    const modal = Modal({
      titulo: `Detalle del usuario ${id}`,
      descripcion: `GET /api/usuarios/${id} · una sola peticion trae el usuario, sus telefonos y sus perfiles sociales.`,
      cuerpo: contenedor,
      acciones: [{ texto: 'Cerrar', variante: 'tonal', onClick: () => modal.cerrar() }]
    });

    modal.abrir();

    /** Recarga el contenido del modal sin cerrarlo. */
    async function refrescarDetalle() {
      try {
        const usuario = await usuarioServicio.obtener(id);

        contenedor.replaceChildren(
          PanelDetalleUsuario({
            usuario,
            acciones: {
              onAgregarTelefono: () =>
                abrirFormularioTelefono(null, usuario, refrescarDetalle),
              onEditarTelefono: (telefono) =>
                abrirFormularioTelefono(telefono, usuario, refrescarDetalle),
              onCambiarEstadoTelefono: async (telefono, activar) => {
                try {
                  await telefonoServicio.cambiarEstado(telefono.id, activar);
                  notificador.exito(
                    `Telefono ${telefono.numeroTelefono} ${activar ? 'activado' : 'desactivado'}.`
                  );
                  await refrescarDetalle();
                  await cargar();
                } catch (error) {
                  notificador.desdeErrorApi(error);
                }
              },
              onEliminarTelefono: (telefono) =>
                confirmarBorradoTelefono(telefono, refrescarDetalle),
              onAgregarPerfil: () =>
                abrirFormularioPerfil(null, usuario, refrescarDetalle),
              onEditarPerfil: (perfil) =>
                abrirFormularioPerfil(perfil, usuario, refrescarDetalle),
              onEliminarPerfil: (perfil) =>
                confirmarBorradoPerfil(perfil, refrescarDetalle)
            }
          })
        );
      } catch (error) {
        contenedor.replaceChildren(
          EstadoError({ error, onReintentar: refrescarDetalle })
        );
      }
    }

    await refrescarDetalle();
  }

  // =====================================================================
  // SUBRECURSOS: telefonos y perfiles sociales del usuario
  // =====================================================================

  /** Formulario de telefono dentro del detalle del usuario. */
  function abrirFormularioTelefono(telefono, usuario, alTerminar) {
    const esEdicion = telefono !== null;

    const formulario = Formulario({
      nota:
        esEdicion
          ? `PUT /api/telefonos/${telefono.id}`
          : `POST /api/usuarios/${usuario.id}/telefonos · el usuarioId viaja en la URL, no en el cuerpo.`,
      grupos: [
        {
          campos: [
            {
              id: 'telefono-numero',
              nombre: 'numeroTelefono',
              etiqueta: 'Numero de telefono',
              tipo: 'tel',
              valor: telefono?.numeroTelefono ?? '',
              requerido: true,
              maximo: CONFIGURACION.longitudMaximaTexto,
              autocompletar: 'tel',
              ayuda: 'Digitos, espacios, + y guiones. Entre 7 y 20 caracteres.',
              validar: (valor) => validarTelefono(valor)
            },
            {
              id: 'telefono-tipo',
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
              id: 'telefono-activo',
              nombre: 'activo',
              etiqueta: 'Estado',
              control: 'seleccion',
              valor: String(telefono?.activo ?? 1),
              opciones: [
                { valor: '1', texto: 'Activo' },
                { valor: '0', texto: 'Inactivo' }
              ]
            }
          ]
        }
      ]
    });

    const modal = Modal({
      titulo: esEdicion ? `Editar el telefono ${telefono.id}` : 'Nuevo telefono',
      descripcion: `Usuario: ${usuario.nombreCompleto} (id ${usuario.id})`,
      cuerpo: formulario.elemento,
      acciones: [
        { texto: 'Cancelar', variante: 'texto', onClick: () => modal.cerrar() },
        {
          texto: esEdicion ? 'Guardar' : 'Crear telefono',
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
                // Usamos la ruta de subrecurso: el usuarioId va en la URL.
                await telefonoServicio.crearParaUsuario(usuario.id, datos);
                notificador.exito('Telefono creado correctamente.');
              }

              modal.cerrar();
              await alTerminar();
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

  /** Confirma y borra un telefono. */
  function confirmarBorradoTelefono(telefono, alTerminar) {
    const modal = ModalConfirmacion({
      titulo: 'Eliminar este telefono?',
      mensaje: `Se ejecutara DELETE /api/telefonos/${telefono.id} (${telefono.numeroTelefono}).`,
      onConfirmar: async () => {
        try {
          await telefonoServicio.eliminar(telefono.id);
          notificador.exito('Telefono eliminado correctamente.');
          await alTerminar();
          await cargar();
        } catch (error) {
          notificador.desdeErrorApi(error);
          throw error;
        }
      }
    });

    modal.abrir();
  }

  /**
   * Formulario de perfil social.
   *
   * CASO INTERESANTE DE LA LLAVE COMPUESTA:
   * al CREAR hay que elegir la red social (es la mitad de la llave),
   * pero al EDITAR ese campo queda deshabilitado, porque la llave
   * identifica el recurso y no se puede cambiar. Si el usuario
   * necesita moverlo a otra red, tiene que borrar y crear de nuevo.
   */
  async function abrirFormularioPerfil(perfil, usuario, alTerminar) {
    const esEdicion = perfil !== null;

    // Necesitamos el catalogo de redes para llenar el desplegable.
    // El servicio lo trae de su cache si ya lo pidio antes.
    let catalogoRedes = [];

    try {
      catalogoRedes = await redSocialServicio.obtenerCatalogo();
    } catch (error) {
      notificador.desdeErrorApi(error);
      return;
    }

    if (catalogoRedes.length === 0) {
      notificador.advertencia(
        'Primero crea al menos una red social en la seccion "Redes sociales".'
      );
      return;
    }

    const formulario = Formulario({
      nota: esEdicion
        ? `PUT /api/perfiles-sociales/${perfil.redSocialId}/${perfil.usuarioId} · solo se puede cambiar urlPerfil, porque la llave compuesta identifica el recurso.`
        : `POST /api/usuarios/${usuario.id}/perfiles-sociales · la llave primaria es (RED_SOCIAL_id, USUARIO_id), asi que un usuario solo puede tener un perfil por red.`,
      grupos: [
        {
          campos: [
            {
              id: 'perfil-red-social',
              nombre: 'redSocialId',
              etiqueta: 'Red social',
              control: 'seleccion',
              valor: String(perfil?.redSocialId ?? ''),
              requerido: !esEdicion,
              textoVacio: 'Selecciona una red social',

              // Al editar, la mitad de la llave compuesta es inmutable.
              deshabilitado: esEdicion,

              opciones: catalogoRedes.map((red) => ({
                valor: red.id,
                texto: `${red.nombre} (id ${red.id})`
              })),
              ayuda: esEdicion
                ? 'No se puede cambiar: forma parte de la llave primaria.'
                : 'Mitad de la llave compuesta (RED_SOCIAL_id).',
              validar: esEdicion ? null : (valor) =>
                valor === '' ? 'Debes elegir una red social.' : null
            },
            {
              id: 'perfil-url',
              nombre: 'urlPerfil',
              etiqueta: 'URL del perfil',
              tipo: 'url',
              valor: perfil?.urlPerfil ?? '',
              maximo: CONFIGURACION.longitudMaximaTexto,
              anchoCompleto: true,
              ayuda: `Opcional. Maximo ${CONFIGURACION.longitudMaximaTexto} caracteres (VARCHAR(45) del modelo).`,
              validar: (valor) =>
                validarURL(valor, {
                  etiqueta: 'La URL del perfil',
                  requerido: false
                })
            }
          ]
        }
      ]
    });

    const modal = Modal({
      titulo: esEdicion
        ? `Editar el perfil ${perfil.redSocialId}:${perfil.usuarioId}`
        : 'Nuevo perfil social',
      descripcion: `Usuario: ${usuario.nombreCompleto} (id ${usuario.id})`,
      cuerpo: formulario.elemento,
      acciones: [
        { texto: 'Cancelar', variante: 'texto', onClick: () => modal.cerrar() },
        {
          texto: esEdicion ? 'Guardar' : 'Crear perfil',
          variante: 'primario',
          icono: 'guardar',
          onClick: async () => {
            if (!formulario.validar()) return;

            modal.establecerCargando(true);

            try {
              const datos = formulario.obtenerDatos();

              if (esEdicion) {
                // Solo enviamos urlPerfil: la API rechaza cualquier
                // intento de cambiar la llave compuesta.
                await perfilSocialServicio.actualizar(
                  perfil.redSocialId,
                  perfil.usuarioId,
                  { urlPerfil: datos.urlPerfil ?? '' }
                );
                notificador.exito('Perfil social actualizado correctamente.');
              } else {
                await perfilSocialServicio.crearParaUsuario(usuario.id, datos);
                notificador.exito('Perfil social creado correctamente.');
              }

              modal.cerrar();
              await alTerminar();
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

  /** Confirma y borra un perfil social por su llave compuesta. */
  function confirmarBorradoPerfil(perfil, alTerminar) {
    const modal = ModalConfirmacion({
      titulo: 'Eliminar este perfil social?',
      mensaje:
        `Se ejecutara DELETE /api/perfiles-sociales/${perfil.redSocialId}/${perfil.usuarioId}. ` +
        'Los dos valores de la URL forman la llave primaria compuesta.',
      onConfirmar: async () => {
        try {
          await perfilSocialServicio.eliminar(perfil.redSocialId, perfil.usuarioId);
          notificador.exito('Perfil social eliminado correctamente.');
          await alTerminar();
          await cargar();
        } catch (error) {
          notificador.desdeErrorApi(error);
          throw error;
        }
      }
    });

    modal.abrir();
  }

  // Interfaz publica de la pagina.
  return { cargar };
}
