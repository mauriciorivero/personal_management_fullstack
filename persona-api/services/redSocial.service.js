/**
 * services/redSocial.service.js
 * ---------------------------------------------------------------------
 * CAPA DE SERVICIO de la entidad RedSocial (tabla de catalogo).
 *
 * Es el servicio mas sencillo, ideal para fijar el patron:
 *   normalizar -> validar -> instanciar -> persistir -> devolver objeto
 *
 * CONCEPTO NUEVO: la PROTECCION AL BORRAR (restriccion de borrado).
 *
 * RED_SOCIAL es una tabla PADRE de PERFIL_SOCIAL. Si borraramos la
 * red social "Instagram" mientras tres usuarios tienen perfiles ahi,
 * esos perfiles quedarian apuntando a un id inexistente: datos
 * huerfanos.
 *
 * Hay tres estrategias posibles ante esa situacion:
 *   1. CASCADE  -> borrar tambien los perfiles. Destructivo.
 *   2. SET NULL -> dejar el perfil sin red. Aqui no sirve, la columna
 *                  es parte de la llave primaria y es NOT NULL.
 *   3. RESTRICT -> prohibir el borrado y avisar. <- la que elegimos.
 *
 * La tercera es la mas segura para un catalogo, y es la que ya pide el
 * modelo relacional con su ON DELETE NO ACTION.
 */

const db = require('../config/database');
const { RedSocial } = require('../models');

const formato = require('../utils/formato');
const AppError = require('../utils/AppError');
const MENSAJES = require('../utils/mensajes');
const { ColectorErrores } = require('../utils/validadores');
const { LIMITES } = require('../utils/constants');

class RedSocialService {
  #camposPermitidos = ['nombre', 'url'];

  #mapaColumnas = {
    nombre: 'nombre',
    url: 'url'
  };

  #columnasSelect = 'id, nombre, url';

  // ------------------------- Metodos privados --------------------------

  #normalizar(datosCrudos) {
    const filtrados = formato.soloCamposPermitidos(datosCrudos, this.#camposPermitidos);
    const limpios = {};

    if (Object.hasOwn(filtrados, 'nombre')) {
      limpios.nombre = formato.limpiarTexto(filtrados.nombre);
    }

    if (Object.hasOwn(filtrados, 'url')) {
      limpios.url = formato.normalizarURL(filtrados.url);
    }

    return limpios;
  }

  #validarCreacion(datos) {
    const errores = new ColectorErrores();

    errores.exigirTexto('nombre', datos.nombre, { maximo: LIMITES.VARCHAR_CORTO });
    errores.exigirURL('url', datos.url, { maximo: LIMITES.VARCHAR_CORTO });

    errores.lanzarSiHay('No se pudo crear la red social porque hay datos invalidos.');
  }

  #validarActualizacion(datos) {
    if (formato.estaVacio(datos)) {
      throw AppError.validacion(
        'Debes enviar al menos un campo valido para actualizar.',
        [{ campo: 'cuerpo', mensaje: `Campos admitidos: ${this.#camposPermitidos.join(', ')}.` }]
      );
    }

    const errores = new ColectorErrores();

    if (Object.hasOwn(datos, 'nombre')) {
      errores.exigirTexto('nombre', datos.nombre, { maximo: LIMITES.VARCHAR_CORTO });
    }
    if (Object.hasOwn(datos, 'url')) {
      errores.exigirURL('url', datos.url, { maximo: LIMITES.VARCHAR_CORTO });
    }

    errores.lanzarSiHay('No se pudo actualizar la red social porque hay datos invalidos.');
  }

  /**
   * Evita nombres de red social repetidos.
   *
   * Comparamos con LOWER() en los dos lados para que "facebook" y
   * "Facebook" se consideren el mismo nombre.
   */
  async #verificarNombreUnico(nombre, idAExcluir = null) {
    let sql = 'SELECT id FROM RED_SOCIAL WHERE LOWER(nombre) = LOWER(?)';
    const parametros = [nombre];

    if (idAExcluir !== null) {
      sql += ' AND id <> ?';
      parametros.push(idAExcluir);
    }

    const fila = await db.obtenerUno(sql, parametros);

    if (fila !== null) {
      throw AppError.conflicto(MENSAJES.NEGOCIO.RED_SOCIAL_DUPLICADA(nombre));
    }
  }

  /**
   * Cuenta cuantos perfiles sociales usan esta red.
   * Lo necesita eliminar() para decidir si permite el borrado.
   */
  async #contarPerfilesAsociados(redSocialId) {
    const fila = await db.obtenerUno(
      'SELECT COUNT(*) AS total FROM PERFIL_SOCIAL WHERE RED_SOCIAL_id = ?',
      [redSocialId]
    );

    return Number(fila?.total ?? 0);
  }

  // --------------------------- CRUD publico ----------------------------

  /** READ (lista) con busqueda y paginacion. */
  async listar(filtros = {}) {
    const pagina = Math.max(1, formato.aEnteroONulo(filtros.pagina) ?? LIMITES.PAGINA_DEFECTO);
    const limite = Math.min(
      Math.max(1, formato.aEnteroONulo(filtros.limite) ?? LIMITES.LIMITE_DEFECTO),
      LIMITES.LIMITE_MAXIMO
    );
    const desplazamiento = (pagina - 1) * limite;

    const condiciones = [];
    const parametros = [];

    const buscar = formato.limpiarTexto(filtros.buscar);
    if (buscar !== null) {
      condiciones.push('(nombre LIKE ? OR url LIKE ?)');
      const patron = `%${buscar}%`;
      parametros.push(patron, patron);
    }

    const clausulaWhere = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const filaTotal = await db.obtenerUno(
      `SELECT COUNT(*) AS total FROM RED_SOCIAL ${clausulaWhere}`,
      parametros
    );
    const total = Number(filaTotal?.total ?? 0);

    const filas = await db.ejecutar(
      `SELECT ${this.#columnasSelect}
       FROM RED_SOCIAL
       ${clausulaWhere}
       ORDER BY nombre
       LIMIT ? OFFSET ?`,
      [...parametros, limite, desplazamiento]
    );

    return {
      redesSociales: filas.map((fila) => RedSocial.desdeFila(fila)),
      total,
      pagina,
      limite
    };
  }

  /** READ (detalle) */
  async obtenerPorId(id) {
    const fila = await db.obtenerUno(
      `SELECT ${this.#columnasSelect} FROM RED_SOCIAL WHERE id = ?`,
      [id]
    );

    if (fila === null) {
      throw AppError.noEncontrado(MENSAJES.NEGOCIO.RED_SOCIAL_NO_EXISTE(id));
    }

    return RedSocial.desdeFila(fila);
  }

  /** CREATE */
  async crear(datosCrudos) {
    const datos = this.#normalizar(datosCrudos);
    this.#validarCreacion(datos);

    await this.#verificarNombreUnico(datos.nombre);

    const redSocial = RedSocial.desdeJSON(datos);
    const fila = redSocial.aFilaBaseDatos();

    const resultado = await db.ejecutar(
      'INSERT INTO RED_SOCIAL (nombre, url) VALUES (?, ?)',
      [fila.nombre, fila.url]
    );

    redSocial.id = resultado.insertId;

    return redSocial;
  }

  /** UPDATE (parcial) */
  async actualizar(id, datosCrudos) {
    const redSocial = await this.obtenerPorId(id);

    const datos = this.#normalizar(datosCrudos);
    this.#validarActualizacion(datos);

    if (Object.hasOwn(datos, 'nombre')) {
      await this.#verificarNombreUnico(datos.nombre, id);
    }

    for (const [campo, valor] of Object.entries(datos)) {
      redSocial[campo] = valor;
    }

    const filaCompleta = redSocial.aFilaBaseDatos();
    const asignaciones = [];
    const parametros = [];

    for (const campo of Object.keys(datos)) {
      const columna = this.#mapaColumnas[campo];
      if (!columna) continue;

      asignaciones.push(`${columna} = ?`);
      parametros.push(filaCompleta[columna]);
    }

    if (asignaciones.length === 0) {
      return redSocial;
    }

    parametros.push(id);

    await db.ejecutar(
      `UPDATE RED_SOCIAL SET ${asignaciones.join(', ')} WHERE id = ?`,
      parametros
    );

    return this.obtenerPorId(id);
  }

  /**
   * DELETE con proteccion de integridad.
   * Si la red tiene perfiles asociados, responde 409 Conflict en lugar
   * de borrar o de dejar que MySQL lance un error tecnico.
   */
  async eliminar(id) {
    const redSocial = await this.obtenerPorId(id);

    const perfilesAsociados = await this.#contarPerfilesAsociados(id);

    if (perfilesAsociados > 0) {
      throw AppError.conflicto(
        `${MENSAJES.NEGOCIO.RED_SOCIAL_EN_USO(id)} Perfiles asociados: ${perfilesAsociados}.`
      );
    }

    await db.ejecutar('DELETE FROM RED_SOCIAL WHERE id = ?', [id]);

    return {
      id: redSocial.id,
      nombre: redSocial.nombre
    };
  }

  /** Lo usa perfilSocial.service para validar la llave foranea. */
  async existe(id) {
    const fila = await db.obtenerUno('SELECT 1 AS existe FROM RED_SOCIAL WHERE id = ?', [id]);
    return fila !== null;
  }
}

module.exports = new RedSocialService();
