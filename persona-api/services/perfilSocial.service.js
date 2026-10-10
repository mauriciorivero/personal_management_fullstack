/**
 * services/perfilSocial.service.js
 * ---------------------------------------------------------------------
 * CAPA DE SERVICIO de la entidad PerfilSocial (tabla puente N:N).
 *
 * ESTE ES EL SERVICIO MAS INTERESANTE. Dos cosas lo hacen distinto a
 * los anteriores:
 *
 * 1. LA LLAVE PRIMARIA ES COMPUESTA: (RED_SOCIAL_id, USUARIO_id).
 *    Consecuencias practicas en TODO el CRUD:
 *      - obtenerPorId recibe DOS parametros, no uno.
 *      - el WHERE siempre lleva las dos columnas:
 *          WHERE RED_SOCIAL_id = ? AND USUARIO_id = ?
 *      - la URL del recurso tiene dos segmentos:
 *          /api/perfiles-sociales/:redSocialId/:usuarioId
 *
 * 2. VALIDA DOS LLAVES FORANEAS antes de insertar: el usuario y la red
 *    social tienen que existir las dos.
 *
 * Y una regla de negocio importante: en un PUT NO se permite cambiar
 * la llave compuesta. Cambiar la identidad de un recurso no es una
 * actualizacion, es un borrado mas una creacion. Lo unico actualizable
 * aqui es `url_perfil`.
 */

const db = require('../config/database');
const { PerfilSocial } = require('../models');
const usuarioService = require('./usuario.service');
const redSocialService = require('./redSocial.service');

const formato = require('../utils/formato');
const AppError = require('../utils/AppError');
const MENSAJES = require('../utils/mensajes');
const { ColectorErrores } = require('../utils/validadores');
const { LIMITES } = require('../utils/constants');

class PerfilSocialService {
  // En la creacion aceptamos las dos llaves y la URL.
  #camposPermitidos = ['redSocialId', 'usuarioId', 'urlPerfil'];

  // En la actualizacion SOLO la URL: la llave compuesta es inmutable.
  #camposActualizables = ['urlPerfil'];

  /**
   * SELECT con JOIN a las dos tablas padre.
   *
   * Por que un JOIN y no tres consultas separadas?
   * Porque una sola consulta a MySQL es mucho mas rapida que tres
   * viajes de ida y vuelta por la red. Los alias red_nombre, red_url,
   * usuario_* los lee PerfilSocial.desdeFila() para armar los objetos
   * relacionados.
   */
  #selectConJoin = `
    SELECT  ps.RED_SOCIAL_id,
            ps.USUARIO_id,
            ps.url_perfil,
            rs.nombre            AS red_nombre,
            rs.url               AS red_url,
            u.primer_nombre      AS usuario_primer_nombre,
            u.primer_apellido    AS usuario_primer_apellido
    FROM    PERFIL_SOCIAL ps
    INNER JOIN RED_SOCIAL rs ON rs.id = ps.RED_SOCIAL_id
    INNER JOIN USUARIO    u  ON u.id  = ps.USUARIO_id
  `;

  // ------------------------- Metodos privados --------------------------

  #normalizar(datosCrudos, camposPermitidos = this.#camposPermitidos) {
    const filtrados = formato.soloCamposPermitidos(datosCrudos, camposPermitidos);
    const limpios = {};

    if (Object.hasOwn(filtrados, 'redSocialId')) {
      limpios.redSocialId = formato.aEnteroONulo(filtrados.redSocialId);
    }

    if (Object.hasOwn(filtrados, 'usuarioId')) {
      limpios.usuarioId = formato.aEnteroONulo(filtrados.usuarioId);
    }

    if (Object.hasOwn(filtrados, 'urlPerfil')) {
      limpios.urlPerfil = formato.normalizarURL(filtrados.urlPerfil);
    }

    return limpios;
  }

  #validarCreacion(datos) {
    const errores = new ColectorErrores();

    // Las dos mitades de la llave compuesta son obligatorias.
    errores.exigirId('redSocialId', datos.redSocialId);
    errores.exigirId('usuarioId', datos.usuarioId);

    // url_perfil es NULL en el modelo, asi que es opcional.
    errores.exigirURL('urlPerfil', datos.urlPerfil, {
      requerido: false,
      maximo: LIMITES.VARCHAR_CORTO
    });

    errores.lanzarSiHay('No se pudo crear el perfil social porque hay datos invalidos.');
  }

  #validarActualizacion(datos) {
    if (formato.estaVacio(datos)) {
      throw AppError.validacion(
        'Solo se puede actualizar el campo "urlPerfil" de un perfil social.',
        [
          {
            campo: 'cuerpo',
            mensaje:
              'La llave compuesta (redSocialId, usuarioId) identifica el recurso y no se puede cambiar. ' +
              'Si necesitas moverlo, elimina el perfil y crea uno nuevo.'
          }
        ]
      );
    }

    const errores = new ColectorErrores();

    errores.exigirURL('urlPerfil', datos.urlPerfil, {
      requerido: false,
      maximo: LIMITES.VARCHAR_CORTO
    });

    errores.lanzarSiHay('No se pudo actualizar el perfil social porque hay datos invalidos.');
  }

  /**
   * Verifica que EXISTAN las dos filas padre.
   *
   * Promise.all lanza las dos consultas en paralelo. Si el usuario no
   * existe Y la red tampoco, informamos del usuario primero porque es
   * el error mas probable en un formulario.
   */
  async #verificarLlavesForaneas(redSocialId, usuarioId) {
    const [existeUsuario, existeRed] = await Promise.all([
      usuarioService.existe(usuarioId),
      redSocialService.existe(redSocialId)
    ]);

    if (!existeUsuario) {
      throw AppError.noEncontrado(MENSAJES.NEGOCIO.USUARIO_NO_EXISTE(usuarioId));
    }

    if (!existeRed) {
      throw AppError.noEncontrado(MENSAJES.NEGOCIO.RED_SOCIAL_NO_EXISTE(redSocialId));
    }
  }

  /**
   * Verifica que la llave compuesta no exista ya.
   *
   * Nota: MySQL tambien lo impide por la PRIMARY KEY, pero asi
   * devolvemos 409 con un mensaje claro en vez del ER_DUP_ENTRY crudo.
   */
  async #verificarNoDuplicado(redSocialId, usuarioId) {
    const fila = await db.obtenerUno(
      `SELECT 1 AS existe
       FROM PERFIL_SOCIAL
       WHERE RED_SOCIAL_id = ? AND USUARIO_id = ?`,
      [redSocialId, usuarioId]
    );

    if (fila !== null) {
      throw AppError.conflicto(
        MENSAJES.NEGOCIO.PERFIL_DUPLICADO(redSocialId, usuarioId)
      );
    }
  }

  // --------------------------- CRUD publico ----------------------------

  /** READ (lista) con filtros y paginacion. */
  async listar(filtros = {}) {
    const pagina = Math.max(1, formato.aEnteroONulo(filtros.pagina) ?? LIMITES.PAGINA_DEFECTO);
    const limite = Math.min(
      Math.max(1, formato.aEnteroONulo(filtros.limite) ?? LIMITES.LIMITE_DEFECTO),
      LIMITES.LIMITE_MAXIMO
    );
    const desplazamiento = (pagina - 1) * limite;

    const condiciones = [];
    const parametros = [];

    const usuarioId = formato.aEnteroONulo(filtros.usuarioId);
    if (usuarioId !== null) {
      condiciones.push('ps.USUARIO_id = ?');
      parametros.push(usuarioId);
    }

    const redSocialId = formato.aEnteroONulo(filtros.redSocialId);
    if (redSocialId !== null) {
      condiciones.push('ps.RED_SOCIAL_id = ?');
      parametros.push(redSocialId);
    }

    const clausulaWhere = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // El conteo tambien necesita los JOIN, porque los filtros podrian
    // apoyarse en columnas de las tablas relacionadas.
    const filaTotal = await db.obtenerUno(
      `SELECT COUNT(*) AS total
       FROM PERFIL_SOCIAL ps
       INNER JOIN RED_SOCIAL rs ON rs.id = ps.RED_SOCIAL_id
       INNER JOIN USUARIO    u  ON u.id  = ps.USUARIO_id
       ${clausulaWhere}`,
      parametros
    );
    const total = Number(filaTotal?.total ?? 0);

    const filas = await db.ejecutar(
      `${this.#selectConJoin}
       ${clausulaWhere}
       ORDER BY u.primer_apellido, rs.nombre
       LIMIT ? OFFSET ?`,
      [...parametros, limite, desplazamiento]
    );

    return {
      perfilesSociales: filas.map((fila) => PerfilSocial.desdeFila(fila)),
      total,
      pagina,
      limite
    };
  }

  /**
   * READ (detalle) por LLAVE COMPUESTA.
   * Observa que recibe dos parametros: asi se consulta una tabla puente.
   */
  async obtenerPorLlave(redSocialId, usuarioId) {
    const fila = await db.obtenerUno(
      `${this.#selectConJoin}
       WHERE ps.RED_SOCIAL_id = ? AND ps.USUARIO_id = ?`,
      [redSocialId, usuarioId]
    );

    if (fila === null) {
      throw AppError.noEncontrado(
        MENSAJES.NEGOCIO.PERFIL_NO_ENCONTRADO(redSocialId, usuarioId)
      );
    }

    return PerfilSocial.desdeFila(fila);
  }

  /** READ - Todos los perfiles sociales de un usuario. */
  async listarPorUsuario(usuarioId) {
    const existe = await usuarioService.existe(usuarioId);

    if (!existe) {
      throw AppError.noEncontrado(MENSAJES.NEGOCIO.USUARIO_NO_EXISTE(usuarioId));
    }

    const filas = await db.ejecutar(
      `${this.#selectConJoin}
       WHERE ps.USUARIO_id = ?
       ORDER BY rs.nombre`,
      [usuarioId]
    );

    return filas.map((fila) => PerfilSocial.desdeFila(fila));
  }

  /** CREATE */
  async crear(datosCrudos) {
    const datos = this.#normalizar(datosCrudos);
    this.#validarCreacion(datos);

    // Primero las dos llaves foraneas...
    await this.#verificarLlavesForaneas(datos.redSocialId, datos.usuarioId);

    // ...y despues que la combinacion no exista ya.
    await this.#verificarNoDuplicado(datos.redSocialId, datos.usuarioId);

    const perfil = PerfilSocial.desdeJSON(datos);
    const fila = perfil.aFilaBaseDatos();

    // Esta tabla NO tiene AUTO_INCREMENT, asi que no hay insertId que
    // recoger: la llave la enviamos nosotros en el INSERT.
    await db.ejecutar(
      `INSERT INTO PERFIL_SOCIAL (RED_SOCIAL_id, USUARIO_id, url_perfil)
       VALUES (?, ?, ?)`,
      [fila.RED_SOCIAL_id, fila.USUARIO_id, fila.url_perfil]
    );

    // Releemos con JOIN para devolver el perfil con el nombre de la red.
    return this.obtenerPorLlave(datos.redSocialId, datos.usuarioId);
  }

  /**
   * UPDATE - Solo cambia `url_perfil`.
   * La llave compuesta identifica el recurso y es inmutable.
   */
  async actualizar(redSocialId, usuarioId, datosCrudos) {
    // Lanza 404 si la combinacion no existe.
    await this.obtenerPorLlave(redSocialId, usuarioId);

    const datos = this.#normalizar(datosCrudos, this.#camposActualizables);
    this.#validarActualizacion(datos);

    await db.ejecutar(
      `UPDATE PERFIL_SOCIAL
       SET url_perfil = ?
       WHERE RED_SOCIAL_id = ? AND USUARIO_id = ?`,
      [datos.urlPerfil ?? null, redSocialId, usuarioId]
    );

    return this.obtenerPorLlave(redSocialId, usuarioId);
  }

  /**
   * DELETE por llave compuesta.
   * PERFIL_SOCIAL es una tabla hoja: nadie depende de ella, asi que el
   * borrado es directo y sin transaccion.
   */
  async eliminar(redSocialId, usuarioId) {
    const perfil = await this.obtenerPorLlave(redSocialId, usuarioId);

    await db.ejecutar(
      'DELETE FROM PERFIL_SOCIAL WHERE RED_SOCIAL_id = ? AND USUARIO_id = ?',
      [redSocialId, usuarioId]
    );

    return {
      redSocialId: perfil.redSocialId,
      usuarioId: perfil.usuarioId,
      urlPerfil: perfil.urlPerfil
    };
  }
}

module.exports = new PerfilSocialService();
