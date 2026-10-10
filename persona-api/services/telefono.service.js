/**
 * services/telefono.service.js
 * ---------------------------------------------------------------------
 * CAPA DE SERVICIO de la entidad Telefono.
 *
 * NUEVO CONCEPTO QUE APARECE AQUI: la INTEGRIDAD REFERENCIAL.
 *
 * Un telefono no puede existir sin su usuario (TELEFONO.USUARIO_id es
 * una llave foranea NOT NULL). Entonces, antes de insertar, este
 * servicio pregunta al usuario.service si ese usuario existe.
 *
 * "Y por que, si MySQL ya valida la llave foranea?"
 * Porque MySQL devuelve el error tecnico ER_NO_REFERENCED_ROW_2, que
 * es incomprensible para un usuario final. Validando antes podemos
 * responder: "No existe un usuario con id 42". La base de datos sigue
 * siendo la ultima linea de defensa, pero la API da el mensaje claro.
 *
 * Fijate tambien como un service PUEDE usar otro service
 * (usuarioService.existe). Eso es composicion: cada clase sabe de lo
 * suyo y colabora con las demas.
 */

const db = require('../config/database');
const { Telefono } = require('../models');
const usuarioService = require('./usuario.service');

const formato = require('../utils/formato');
const AppError = require('../utils/AppError');
const MENSAJES = require('../utils/mensajes');
const { ColectorErrores } = require('../utils/validadores');
const { LIMITES, TIPOS_TELEFONO, ESTADO_TELEFONO } = require('../utils/constants');

class TelefonoService {
  // Lista blanca de campos que acepta del cliente.
  #camposPermitidos = ['numeroTelefono', 'tipoTelefono', 'usuarioId', 'activo'];

  // Mapa camelCase -> columna real de MySQL.
  #mapaColumnas = {
    numeroTelefono: 'numero_telefono',
    tipoTelefono: 'tipo_telefono',
    usuarioId: 'USUARIO_id',
    activo: 'activo'
  };

  #columnasSelect = 'id, numero_telefono, tipo_telefono, USUARIO_id, activo';

  // ------------------------- Metodos privados --------------------------

  /** Limpia y convierte los datos recibidos. */
  #normalizar(datosCrudos) {
    const filtrados = formato.soloCamposPermitidos(datosCrudos, this.#camposPermitidos);
    const limpios = {};

    if (Object.hasOwn(filtrados, 'numeroTelefono')) {
      limpios.numeroTelefono = formato.normalizarTelefono(filtrados.numeroTelefono);
    }

    if (Object.hasOwn(filtrados, 'tipoTelefono')) {
      // aTituloPropio deja "celular" como "Celular", que es justo
      // lo que espera la lista TIPOS_TELEFONO.
      limpios.tipoTelefono = formato.aTituloPropio(filtrados.tipoTelefono);
    }

    if (Object.hasOwn(filtrados, 'usuarioId')) {
      limpios.usuarioId = formato.aEnteroONulo(filtrados.usuarioId);
    }

    if (Object.hasOwn(filtrados, 'activo')) {
      limpios.activo = formato.aBanderaEntera(filtrados.activo, ESTADO_TELEFONO.ACTIVO);
    }

    return limpios;
  }

  /** Validacion para POST: numero, tipo y usuarioId son obligatorios. */
  #validarCreacion(datos) {
    const errores = new ColectorErrores();

    errores.exigirTelefono('numeroTelefono', datos.numeroTelefono);
    errores.exigirValorDeLista('tipoTelefono', datos.tipoTelefono, TIPOS_TELEFONO);
    errores.exigirId('usuarioId', datos.usuarioId);
    errores.exigirEntero('activo', datos.activo, {
      requerido: false,
      minimo: 0,
      maximo: 1
    });

    errores.lanzarSiHay('No se pudo crear el telefono porque hay datos invalidos.');
  }

  /** Validacion para PUT: todo opcional, pero lo que venga debe ser valido. */
  #validarActualizacion(datos) {
    if (formato.estaVacio(datos)) {
      throw AppError.validacion(
        'Debes enviar al menos un campo valido para actualizar.',
        [{ campo: 'cuerpo', mensaje: `Campos admitidos: ${this.#camposPermitidos.join(', ')}.` }]
      );
    }

    const errores = new ColectorErrores();

    if (Object.hasOwn(datos, 'numeroTelefono')) {
      errores.exigirTelefono('numeroTelefono', datos.numeroTelefono);
    }
    if (Object.hasOwn(datos, 'tipoTelefono')) {
      errores.exigirValorDeLista('tipoTelefono', datos.tipoTelefono, TIPOS_TELEFONO);
    }
    if (Object.hasOwn(datos, 'usuarioId')) {
      errores.exigirId('usuarioId', datos.usuarioId);
    }
    if (Object.hasOwn(datos, 'activo')) {
      errores.exigirEntero('activo', datos.activo, { minimo: 0, maximo: 1 });
    }

    errores.lanzarSiHay('No se pudo actualizar el telefono porque hay datos invalidos.');
  }

  /**
   * Verifica que el usuario referenciado exista.
   * @throws {AppError} 404 si no existe.
   */
  async #verificarUsuario(usuarioId) {
    const existe = await usuarioService.existe(usuarioId);

    if (!existe) {
      throw AppError.noEncontrado(MENSAJES.NEGOCIO.USUARIO_NO_EXISTE(usuarioId));
    }
  }

  /**
   * Evita numeros de telefono repetidos.
   *
   * El modelo relacional NO tiene un indice UNIQUE en numero_telefono,
   * asi que esta es una regla de NEGOCIO que imponemos desde la API.
   *
   * @param {string} numero
   * @param {number|null} idAExcluir  Al actualizar, ignoramos el propio
   *                                  registro (si no, choca consigo mismo).
   */
  async #verificarNumeroUnico(numero, idAExcluir = null) {
    let sql = 'SELECT id FROM TELEFONO WHERE numero_telefono = ?';
    const parametros = [numero];

    if (idAExcluir !== null) {
      sql += ' AND id <> ?';
      parametros.push(idAExcluir);
    }

    const fila = await db.obtenerUno(sql, parametros);

    if (fila !== null) {
      throw AppError.conflicto(MENSAJES.NEGOCIO.TELEFONO_DUPLICADO(numero));
    }
  }

  // --------------------------- CRUD publico ----------------------------

  /**
   * READ (lista) con filtros y paginacion.
   *
   * @param {object} filtros
   * @param {number} filtros.usuarioId  Filtra los telefonos de un usuario.
   * @param {*}      filtros.activo     1 o 0.
   * @param {string} filtros.tipo       Celular, Fijo...
   * @param {string} filtros.buscar     Busqueda parcial por numero.
   */
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
      condiciones.push('USUARIO_id = ?');
      parametros.push(usuarioId);
    }

    const activo = formato.aBanderaEntera(filtros.activo, null);
    if (activo !== null) {
      condiciones.push('activo = ?');
      parametros.push(activo);
    }

    const tipo = formato.limpiarTexto(filtros.tipo);
    if (tipo !== null) {
      condiciones.push('tipo_telefono = ?');
      parametros.push(tipo);
    }

    const buscar = formato.limpiarTexto(filtros.buscar);
    if (buscar !== null) {
      condiciones.push('numero_telefono LIKE ?');
      parametros.push(`%${buscar}%`);
    }

    const clausulaWhere = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const filaTotal = await db.obtenerUno(
      `SELECT COUNT(*) AS total FROM TELEFONO ${clausulaWhere}`,
      parametros
    );
    const total = Number(filaTotal?.total ?? 0);

    const filas = await db.ejecutar(
      `SELECT ${this.#columnasSelect}
       FROM TELEFONO
       ${clausulaWhere}
       ORDER BY USUARIO_id, id
       LIMIT ? OFFSET ?`,
      [...parametros, limite, desplazamiento]
    );

    return {
      telefonos: filas.map((fila) => Telefono.desdeFila(fila)),
      total,
      pagina,
      limite
    };
  }

  /**
   * READ (detalle) por id.
   * @throws {AppError} 404 si no existe.
   */
  async obtenerPorId(id) {
    const fila = await db.obtenerUno(
      `SELECT ${this.#columnasSelect} FROM TELEFONO WHERE id = ?`,
      [id]
    );

    if (fila === null) {
      throw AppError.noEncontrado(MENSAJES.NEGOCIO.NO_ENCONTRADO('un telefono', id));
    }

    return Telefono.desdeFila(fila);
  }

  /**
   * READ - Todos los telefonos de un usuario.
   * Primero valida que el usuario exista, para distinguir dos casos
   * muy distintos:
   *   - usuario que existe y no tiene telefonos -> lista vacia (200)
   *   - usuario que no existe                   -> 404
   */
  async listarPorUsuario(usuarioId) {
    await this.#verificarUsuario(usuarioId);

    const filas = await db.ejecutar(
      `SELECT ${this.#columnasSelect} FROM TELEFONO WHERE USUARIO_id = ? ORDER BY id`,
      [usuarioId]
    );

    return filas.map((fila) => Telefono.desdeFila(fila));
  }

  /** CREATE */
  async crear(datosCrudos) {
    const datos = this.#normalizar(datosCrudos);
    this.#validarCreacion(datos);

    // Reglas de negocio ANTES de tocar la base de datos.
    await this.#verificarUsuario(datos.usuarioId);
    await this.#verificarNumeroUnico(datos.numeroTelefono);

    const telefono = Telefono.desdeJSON(datos);
    const fila = telefono.aFilaBaseDatos();

    const resultado = await db.ejecutar(
      `INSERT INTO TELEFONO (numero_telefono, tipo_telefono, USUARIO_id, activo)
       VALUES (?, ?, ?, ?)`,
      [fila.numero_telefono, fila.tipo_telefono, fila.USUARIO_id, fila.activo]
    );

    telefono.id = resultado.insertId;

    return telefono;
  }

  /** UPDATE (parcial) */
  async actualizar(id, datosCrudos) {
    const telefono = await this.obtenerPorId(id);

    const datos = this.#normalizar(datosCrudos);
    this.#validarActualizacion(datos);

    // Si cambia de dueno, el nuevo usuario tiene que existir.
    if (Object.hasOwn(datos, 'usuarioId')) {
      await this.#verificarUsuario(datos.usuarioId);
    }

    // Si cambia el numero, no puede chocar con otro registro.
    if (Object.hasOwn(datos, 'numeroTelefono')) {
      await this.#verificarNumeroUnico(datos.numeroTelefono, id);
    }

    // Aplicamos los cambios al objeto mediante sus setters.
    for (const [campo, valor] of Object.entries(datos)) {
      if (campo === 'usuarioId') {
        // El modelo guarda el dueno en `usuario`, que acepta un id.
        telefono.usuario = valor;
      } else {
        telefono[campo] = valor;
      }
    }

    // UPDATE dinamico con nombres de columna del mapa interno.
    const filaCompleta = telefono.aFilaBaseDatos();
    const asignaciones = [];
    const parametros = [];

    for (const campo of Object.keys(datos)) {
      const columna = this.#mapaColumnas[campo];
      if (!columna) continue;

      asignaciones.push(`${columna} = ?`);
      parametros.push(filaCompleta[columna]);
    }

    if (asignaciones.length === 0) {
      return telefono;
    }

    parametros.push(id);

    await db.ejecutar(
      `UPDATE TELEFONO SET ${asignaciones.join(', ')} WHERE id = ?`,
      parametros
    );

    return this.obtenerPorId(id);
  }

  /**
   * DELETE
   *
   * Aqui NO hace falta transaccion: TELEFONO es una tabla "hoja",
   * ninguna otra tabla la referencia, asi que el borrado es una sola
   * operacion atomica por si misma.
   */
  async eliminar(id) {
    const telefono = await this.obtenerPorId(id);

    await db.ejecutar('DELETE FROM TELEFONO WHERE id = ?', [id]);

    return {
      id: telefono.id,
      numeroTelefono: telefono.numeroTelefono,
      usuarioId: telefono.usuarioId
    };
  }

  /**
   * Cambia la bandera `activo` (baja o alta logica).
   * Es un buen ejemplo de un metodo de negocio que NO es CRUD puro:
   * la operacion se le delega al MODELO (activar/desactivar) y el
   * service solo persiste el resultado.
   */
  async cambiarEstado(id, activar) {
    const telefono = await this.obtenerPorId(id);

    // El objeto decide como representar su propio estado.
    if (activar) {
      telefono.activar();
    } else {
      telefono.desactivar();
    }

    await db.ejecutar('UPDATE TELEFONO SET activo = ? WHERE id = ?', [
      telefono.activo,
      id
    ]);

    return telefono;
  }
}

module.exports = new TelefonoService();
