/**
 * services/usuario.service.js
 * ---------------------------------------------------------------------
 * CAPA DE SERVICIO de la entidad Usuario.
 *
 * QUE RESPONSABILIDAD TIENE ESTA CAPA?
 * Es el CEREBRO de la aplicacion: aqui viven las reglas de negocio.
 *
 *   El controlador  -> habla HTTP (req, res, codigos de estado).
 *   El servicio     -> NO sabe que existe HTTP. Recibe y devuelve
 *                      objetos de JavaScript.
 *   El modelo       -> solo guarda datos y comportamiento del dominio.
 *   La base de datos-> solo persiste.
 *
 * Por que separar asi? Porque esta clase se podria reutilizar tal cual
 * desde una aplicacion de consola, desde una tarea programada o desde
 * un bot de WhatsApp. Si la logica estuviera en el controlador, estaria
 * amarrada a Express para siempre.
 *
 * EL FLUJO DE CADA METODO SIGUE SIEMPRE EL MISMO ORDEN:
 *
 *   1. NORMALIZAR  (utils/formato.js)    -> limpiar los datos
 *   2. VALIDAR     (utils/validadores.js)-> rechazar lo invalido
 *   3. INSTANCIAR  (models/Usuario.js)   -> crear el objeto
 *   4. PERSISTIR   (config/database.js)  -> guardar con SQL parametrizado
 *   5. DEVOLVER    el objeto, no la fila cruda
 *
 * Y TODO el acceso a los datos del objeto pasa por sus GETTERS: nunca
 * se toca un atributo privado. Eso es encapsulamiento en la practica.
 */

const db = require('../config/database');
const { Usuario, Telefono, PerfilSocial } = require('../models');

const formato = require('../utils/formato');
const fechas = require('../utils/fechas');
const AppError = require('../utils/AppError');
const MENSAJES = require('../utils/mensajes');
const { ColectorErrores } = require('../utils/validadores');
const { LIMITES, ESTADO_USUARIO } = require('../utils/constants');

class UsuarioService {
  // =====================================================================
  // ATRIBUTOS PRIVADOS DE LA CLASE
  // ---------------------------------------------------------------------
  // #camposPermitidos es la LISTA BLANCA de lo que el cliente puede
  // enviar. Cualquier otra propiedad del JSON se descarta.
  //
  // Fijate que `id` y `edad` NO estan en la lista:
  //   - el id lo genera MySQL (AUTO_INCREMENT);
  //   - la edad la calcula la API desde fechaNacimiento.
  // Si estuvieran, un cliente malicioso podria mandar
  // { "id": 1, "edad": 999 } y corromper los datos.
  // =====================================================================
  #camposPermitidos = [
    'primerNombre',
    'segundoNombre',
    'primerApellido',
    'segundoApellido',
    'fechaNacimiento',
    'ciudadDomicilio',
    'estado'
  ];

  // Mapa camelCase (JavaScript) -> snake_case (columnas de MySQL).
  // Lo usamos para construir el UPDATE dinamico de forma SEGURA:
  // los nombres de columna salen SIEMPRE de este mapa, nunca del
  // cliente, asi que no se puede inyectar SQL por el nombre del campo.
  #mapaColumnas = {
    primerNombre: 'primer_nombre',
    segundoNombre: 'segundo_nombre',
    primerApellido: 'primer_apellido',
    segundoApellido: 'segundo_apellido',
    fechaNacimiento: 'fecha_nacimiento',
    edad: 'edad',
    ciudadDomicilio: 'ciudad_domicilio',
    estado: 'estado'
  };

  // Columnas que se traen en los SELECT. Escribirlas de forma explicita
  // (y no SELECT *) hace la consulta mas rapida y evita que un cambio
  // en la tabla rompa la aplicacion sin avisar.
  #columnasSelect = `
    id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
    fecha_nacimiento, edad, ciudad_domicilio, estado
  `;

  /**
   * Columnas del LISTADO: las de arriba mas los conteos de relaciones.
   *
   * =================== EL PROBLEMA "N + 1" ===================
   *
   * El listado necesita mostrar cuantos telefonos y cuantos perfiles
   * tiene cada usuario. La forma INGENUA de resolverlo seria:
   *
   *   1 consulta para traer los 50 usuarios
   *   + 50 consultas para contar sus telefonos
   *   + 50 consultas para contar sus perfiles
   *   = 101 viajes a la base de datos
   *
   * Eso se llama problema "N + 1" y es la causa numero uno de APIs
   * lentas. Con 50 ms por consulta serian 5 segundos de espera.
   *
   * =================== LA SOLUCION ===================
   *
   * Una SUBCONSULTA CORRELACIONADA: una consulta anidada que MySQL
   * evalua por cada fila del resultado, pero DENTRO del mismo viaje.
   *
   *   (SELECT COUNT(*) FROM TELEFONO t WHERE t.USUARIO_id = u.id)
   *
   * Se llama "correlacionada" porque depende de la fila externa
   * (u.id). Total: UNA sola consulta en lugar de 101.
   *
   * El alias `u` de la consulta externa es lo que permite la
   * correlacion, por eso el FROM del listado dice `FROM USUARIO u`.
   */
  #columnasSelectListado = `
    u.id, u.primer_nombre, u.segundo_nombre, u.primer_apellido, u.segundo_apellido,
    u.fecha_nacimiento, u.edad, u.ciudad_domicilio, u.estado,
    (SELECT COUNT(*) FROM TELEFONO      t  WHERE t.USUARIO_id  = u.id) AS total_telefonos,
    (SELECT COUNT(*) FROM PERFIL_SOCIAL ps WHERE ps.USUARIO_id = u.id) AS total_perfiles_sociales
  `;

  // =====================================================================
  // METODOS PRIVADOS DE APOYO
  // =====================================================================

  /**
   * Deja los datos del cliente limpios y con el tipo correcto.
   *
   * Nota de disenio: solo normalizamos las propiedades que REALMENTE
   * llegaron (Object.hasOwn). Esto es clave para el PUT parcial: si el
   * cliente no envio `ciudadDomicilio`, no queremos convertirla en null
   * y borrar el dato que ya existia.
   *
   * @param {object} datosCrudos  req.body tal como llego.
   * @returns {object} Datos normalizados, solo con los campos enviados.
   */
  #normalizar(datosCrudos) {
    // Paso 1: descartar cualquier campo que no este en la lista blanca.
    const filtrados = formato.soloCamposPermitidos(datosCrudos, this.#camposPermitidos);
    const limpios = {};

    // Los nombres propios se guardan en "Titulo Propio": "ANA maria" -> "Ana Maria"
    if (Object.hasOwn(filtrados, 'primerNombre')) {
      limpios.primerNombre = formato.aTituloPropio(filtrados.primerNombre);
    }
    if (Object.hasOwn(filtrados, 'segundoNombre')) {
      limpios.segundoNombre = formato.aTituloPropio(filtrados.segundoNombre);
    }
    if (Object.hasOwn(filtrados, 'primerApellido')) {
      limpios.primerApellido = formato.aTituloPropio(filtrados.primerApellido);
    }
    if (Object.hasOwn(filtrados, 'segundoApellido')) {
      limpios.segundoApellido = formato.aTituloPropio(filtrados.segundoApellido);
    }
    if (Object.hasOwn(filtrados, 'ciudadDomicilio')) {
      limpios.ciudadDomicilio = formato.aTituloPropio(filtrados.ciudadDomicilio);
    }

    // La fecha se reduce al formato ISO corto "AAAA-MM-DD".
    if (Object.hasOwn(filtrados, 'fechaNacimiento')) {
      limpios.fechaNacimiento =
        fechas.aFechaISO(filtrados.fechaNacimiento) ?? filtrados.fechaNacimiento;
    }

    // El estado se convierte a 1 o 0.
    if (Object.hasOwn(filtrados, 'estado')) {
      limpios.estado = formato.aBanderaEntera(filtrados.estado, ESTADO_USUARIO.ACTIVO);
    }

    return limpios;
  }

  /**
   * Valida los datos para una CREACION (POST): los campos obligatorios
   * del modelo relacional tienen que venir todos.
   *
   * @param {object} datos  Datos ya normalizados.
   * @throws {AppError} 400 con la lista completa de errores.
   */
  #validarCreacion(datos) {
    const errores = new ColectorErrores();

    // Obligatorios segun el script SQL (columnas NOT NULL).
    errores.exigirTexto('primerNombre', datos.primerNombre, { soloLetras: true });
    errores.exigirTexto('primerApellido', datos.primerApellido, { soloLetras: true });
    errores.exigirTexto('ciudadDomicilio', datos.ciudadDomicilio, { soloLetras: true });
    errores.exigirFecha('fechaNacimiento', datos.fechaNacimiento);

    // Opcionales (columnas NULL): requerido: false.
    errores.exigirTexto('segundoNombre', datos.segundoNombre, {
      requerido: false,
      soloLetras: true
    });
    errores.exigirTexto('segundoApellido', datos.segundoApellido, {
      requerido: false,
      soloLetras: true
    });
    errores.exigirEntero('estado', datos.estado, { requerido: false, minimo: 0, maximo: 1 });

    // Si hubo errores, lanza AppError 400 con TODOS de una sola vez.
    errores.lanzarSiHay('No se pudo crear el usuario porque hay datos invalidos.');
  }

  /**
   * Valida los datos para una ACTUALIZACION (PUT).
   *
   * Diferencia clave con #validarCreacion: aqui TODOS los campos son
   * opcionales, porque permitimos actualizaciones parciales. Pero si un
   * campo viene, tiene que ser valido.
   */
  #validarActualizacion(datos) {
    if (formato.estaVacio(datos)) {
      throw AppError.validacion(
        'Debes enviar al menos un campo valido para actualizar.',
        [{ campo: 'cuerpo', mensaje: `Campos admitidos: ${this.#camposPermitidos.join(', ')}.` }]
      );
    }

    const errores = new ColectorErrores();

    // El patron es: "si el cliente envio este campo, validalo".
    if (Object.hasOwn(datos, 'primerNombre')) {
      errores.exigirTexto('primerNombre', datos.primerNombre, { soloLetras: true });
    }
    if (Object.hasOwn(datos, 'primerApellido')) {
      errores.exigirTexto('primerApellido', datos.primerApellido, { soloLetras: true });
    }
    if (Object.hasOwn(datos, 'ciudadDomicilio')) {
      errores.exigirTexto('ciudadDomicilio', datos.ciudadDomicilio, { soloLetras: true });
    }
    if (Object.hasOwn(datos, 'fechaNacimiento')) {
      errores.exigirFecha('fechaNacimiento', datos.fechaNacimiento);
    }
    if (Object.hasOwn(datos, 'segundoNombre')) {
      errores.exigirTexto('segundoNombre', datos.segundoNombre, {
        requerido: false,
        soloLetras: true
      });
    }
    if (Object.hasOwn(datos, 'segundoApellido')) {
      errores.exigirTexto('segundoApellido', datos.segundoApellido, {
        requerido: false,
        soloLetras: true
      });
    }
    if (Object.hasOwn(datos, 'estado')) {
      errores.exigirEntero('estado', datos.estado, { minimo: 0, maximo: 1 });
    }

    errores.lanzarSiHay('No se pudo actualizar el usuario porque hay datos invalidos.');
  }

  /**
   * Carga los telefonos y los perfiles sociales de un usuario y los
   * agrega al objeto recibido.
   *
   * Observa que NO tocamos atributos privados: usamos los metodos
   * publicos agregarTelefono() y agregarPerfilSocial(). El objeto
   * controla como crece su propio estado.
   *
   * @param {Usuario} usuario
   * @returns {Promise<Usuario>} El mismo objeto, ya con relaciones.
   */
  async #cargarRelaciones(usuario) {
    const id = usuario.id;

    // Promise.all lanza las dos consultas EN PARALELO en lugar de
    // esperar una y despues la otra. Con dos consultas de 20 ms, pasa
    // de 40 ms a 20 ms.
    const [filasTelefonos, filasPerfiles] = await Promise.all([
      db.ejecutar(
        `SELECT id, numero_telefono, tipo_telefono, USUARIO_id, activo
         FROM TELEFONO
         WHERE USUARIO_id = ?
         ORDER BY id`,
        [id]
      ),
      // JOIN para traer tambien el nombre y la URL de la red social.
      // Los alias red_nombre y red_url los usa PerfilSocial.desdeFila().
      db.ejecutar(
        `SELECT  ps.RED_SOCIAL_id,
                 ps.USUARIO_id,
                 ps.url_perfil,
                 rs.nombre AS red_nombre,
                 rs.url    AS red_url
         FROM    PERFIL_SOCIAL ps
         INNER JOIN RED_SOCIAL rs ON rs.id = ps.RED_SOCIAL_id
         WHERE   ps.USUARIO_id = ?
         ORDER BY rs.nombre`,
        [id]
      )
    ]);

    // Convertimos cada fila en un objeto del dominio.
    for (const fila of filasTelefonos) {
      usuario.agregarTelefono(Telefono.desdeFila(fila));
    }

    for (const fila of filasPerfiles) {
      usuario.agregarPerfilSocial(PerfilSocial.desdeFila(fila));
    }

    return usuario;
  }

  // =====================================================================
  // METODOS PUBLICOS: EL CRUD
  // =====================================================================

  /**
   * READ (lista) - Devuelve usuarios con filtros y paginacion.
   *
   * CONSTRUCCION DINAMICA Y SEGURA DEL WHERE:
   * Armamos dos arreglos en paralelo: uno con los textos de las
   * condiciones y otro con los valores. El texto nunca contiene datos
   * del cliente, solo signos de interrogacion.
   *
   * @param {object} filtros
   * @param {number} filtros.pagina   Pagina solicitada (base 1).
   * @param {number} filtros.limite   Registros por pagina.
   * @param {*}      filtros.estado   1 o 0 para filtrar por estado.
   * @param {string} filtros.ciudad   Filtro parcial por ciudad.
   * @param {string} filtros.buscar   Busqueda en nombres y apellidos.
   * @returns {Promise<{usuarios: Usuario[], total: number, pagina: number, limite: number}>}
   */
  async listar(filtros = {}) {
    // ---- Paginacion ----
    // Si el cliente no envia nada, usamos los valores por defecto.
    const paginaSolicitada = formato.aEnteroONulo(filtros.pagina) ?? LIMITES.PAGINA_DEFECTO;
    const limiteSolicitado = formato.aEnteroONulo(filtros.limite) ?? LIMITES.LIMITE_DEFECTO;

    // Math.max(1, ...) evita paginas 0 o negativas.
    const pagina = Math.max(1, paginaSolicitada);

    // Math.min protege el servidor: aunque pidan limite=100000, el
    // tope real es LIMITE_MAXIMO. Asi nadie puede tumbar la API
    // pidiendo un millon de filas.
    const limite = Math.min(Math.max(1, limiteSolicitado), LIMITES.LIMITE_MAXIMO);

    // OFFSET = cuantas filas saltar. Pagina 3 con limite 10 -> saltar 20.
    const desplazamiento = (pagina - 1) * limite;

    // ---- WHERE dinamico ----
    const condiciones = [];
    const parametros = [];

    // Filtro por estado (activo / inactivo).
    const estado = formato.aBanderaEntera(filtros.estado, null);
    if (estado !== null) {
      condiciones.push('estado = ?');
      parametros.push(estado);
    }

    // Filtro por ciudad (coincidencia parcial).
    const ciudad = formato.limpiarTexto(filtros.ciudad);
    if (ciudad !== null) {
      condiciones.push('ciudad_domicilio LIKE ?');
      // Los comodines % van en el VALOR, no en el texto de la consulta.
      parametros.push(`%${ciudad}%`);
    }

    // Busqueda libre en nombres y apellidos.
    const buscar = formato.limpiarTexto(filtros.buscar);
    if (buscar !== null) {
      condiciones.push(`(
        primer_nombre    LIKE ? OR
        segundo_nombre   LIKE ? OR
        primer_apellido  LIKE ? OR
        segundo_apellido LIKE ?
      )`);
      const patron = `%${buscar}%`;
      parametros.push(patron, patron, patron, patron);
    }

    // Si no hay condiciones dejamos la clausula vacia.
    const clausulaWhere =
      condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // ---- Consulta de conteo (para la paginacion) ----
    const filaTotal = await db.obtenerUno(
      `SELECT COUNT(*) AS total FROM USUARIO ${clausulaWhere}`,
      parametros
    );
    const total = Number(filaTotal?.total ?? 0);

    // ---- Consulta de datos ----
    // Fijate en `FROM USUARIO u`: ese alias es el que usan las
    // subconsultas correlacionadas de #columnasSelectListado.
    const filas = await db.ejecutar(
      `SELECT ${this.#columnasSelectListado}
       FROM USUARIO u
       ${clausulaWhere}
       ORDER BY u.primer_apellido, u.primer_nombre
       LIMIT ? OFFSET ?`,
      // Los parametros del WHERE van primero y despues los del LIMIT,
      // en el MISMO orden en que aparecen los signos ? en la consulta.
      [...parametros, limite, desplazamiento]
    );

    // map() convierte cada fila cruda en un objeto Usuario.
    const usuarios = filas.map((fila) => Usuario.desdeFila(fila));

    return { usuarios, total, pagina, limite };
  }

  /**
   * READ (detalle) - Devuelve un usuario por id, con sus relaciones.
   *
   * @param {number} id
   * @param {object} opciones
   * @param {boolean} opciones.incluirRelaciones  Cargar telefonos y perfiles.
   * @returns {Promise<Usuario>}
   * @throws {AppError} 404 si el usuario no existe.
   */
  async obtenerPorId(id, opciones = {}) {
    const { incluirRelaciones = true } = opciones;

    const fila = await db.obtenerUno(
      `SELECT ${this.#columnasSelect} FROM USUARIO WHERE id = ?`,
      [id]
    );

    // Regla de negocio: si no existe, es un 404, no una lista vacia.
    if (fila === null) {
      throw AppError.noEncontrado(MENSAJES.NEGOCIO.USUARIO_NO_EXISTE(id));
    }

    const usuario = Usuario.desdeFila(fila);

    if (incluirRelaciones) {
      await this.#cargarRelaciones(usuario);
    }

    return usuario;
  }

  /**
   * CREATE - Inserta un usuario nuevo.
   *
   * @param {object} datosCrudos  req.body
   * @returns {Promise<Usuario>}  El usuario creado, ya con su id.
   */
  async crear(datosCrudos) {
    // 1. Normalizar
    const datos = this.#normalizar(datosCrudos);

    // 2. Validar
    this.#validarCreacion(datos);

    // 3. Instanciar el objeto del dominio
    const usuario = Usuario.desdeJSON(datos);

    // La API NUNCA confia en la edad que envie el cliente: la calcula
    // ella misma a partir de la fecha de nacimiento. Esta es la regla
    // de negocio mas importante de esta entidad.
    usuario.recalcularEdad();

    // 4. Persistir. aFilaBaseDatos() traduce el objeto a columnas.
    const fila = usuario.aFilaBaseDatos();

    const resultado = await db.ejecutar(
      `INSERT INTO USUARIO
         (primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
          fecha_nacimiento, edad, ciudad_domicilio, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fila.primer_nombre,
        fila.segundo_nombre,
        fila.primer_apellido,
        fila.segundo_apellido,
        fila.fecha_nacimiento,
        fila.edad,
        fila.ciudad_domicilio,
        fila.estado
      ]
    );

    // MySQL nos devuelve el id que genero el AUTO_INCREMENT.
    // Lo asignamos POR EL SETTER, no tocando el atributo privado.
    usuario.id = resultado.insertId;

    return usuario;
  }

  /**
   * UPDATE - Actualiza un usuario existente (actualizacion parcial).
   *
   * @param {number} id
   * @param {object} datosCrudos
   * @returns {Promise<Usuario>}  El usuario ya actualizado.
   */
  async actualizar(id, datosCrudos) {
    // 1. Verificar que exista. Si no, obtenerPorId lanza el 404.
    //    Pedimos sin relaciones porque aqui no las necesitamos.
    const usuario = await this.obtenerPorId(id, { incluirRelaciones: false });

    // 2. Normalizar y validar solo lo que llego.
    const datos = this.#normalizar(datosCrudos);
    this.#validarActualizacion(datos);

    // 3. Aplicar los cambios AL OBJETO usando sus SETTERS.
    //
    //    Aqui se ve el valor del encapsulamiento: al asignar
    //    `usuario.fechaNacimiento`, el setter del modelo recalcula la
    //    edad solo. El service no tiene que acordarse de hacerlo.
    for (const [campo, valor] of Object.entries(datos)) {
      usuario[campo] = valor;
    }

    // Por seguridad forzamos el recalculo (cubre el caso de datos
    // viejos que vinieran con la edad desincronizada).
    usuario.recalcularEdad();

    // 4. Construir el UPDATE dinamico.
    //    Solo actualizamos las columnas que cambiaron, mas `edad`,
    //    que siempre se recalcula.
    const camposAActualizar = Object.keys(datos);

    if (Object.hasOwn(datos, 'fechaNacimiento') && !camposAActualizar.includes('edad')) {
      camposAActualizar.push('edad');
    }

    const asignaciones = [];
    const parametros = [];
    const filaCompleta = usuario.aFilaBaseDatos();

    for (const campo of camposAActualizar) {
      // El nombre de la columna sale del MAPA, nunca del cliente.
      const columna = this.#mapaColumnas[campo];

      // Si el campo no esta en el mapa, lo ignoramos en silencio.
      if (!columna) continue;

      asignaciones.push(`${columna} = ?`);
      parametros.push(filaCompleta[columna]);
    }

    // Si tras el filtrado no quedo nada que actualizar, devolvemos el
    // usuario sin tocar la base de datos.
    if (asignaciones.length === 0) {
      return this.obtenerPorId(id);
    }

    // El id va al final porque es el ultimo ? de la consulta (el WHERE).
    parametros.push(id);

    await db.ejecutar(
      `UPDATE USUARIO SET ${asignaciones.join(', ')} WHERE id = ?`,
      parametros
    );

    // 5. Devolvemos el estado final leido de la base de datos, para
    //    que el cliente vea exactamente lo que quedo guardado.
    return this.obtenerPorId(id);
  }

  /**
   * DELETE - Elimina un usuario y todo lo que depende de el.
   *
   * POR QUE HACE FALTA UNA TRANSACCION?
   * El modelo relacional define las llaves foraneas con
   * ON DELETE NO ACTION, asi que MySQL NO borra en cascada: si
   * intentamos borrar el usuario con telefonos asociados, falla con el
   * error ER_ROW_IS_REFERENCED.
   *
   * Hay que borrar en orden inverso a la dependencia:
   *    1. PERFIL_SOCIAL  (depende de USUARIO)
   *    2. TELEFONO       (depende de USUARIO)
   *    3. USUARIO
   *
   * Si el paso 3 fallara y no usaramos transaccion, el usuario se
   * quedaria sin telefonos ni perfiles: datos destruidos a medias.
   * La transaccion garantiza TODO o NADA.
   *
   * @param {number} id
   * @returns {Promise<{id: number, nombreCompleto: string, telefonosEliminados: number, perfilesEliminados: number}>}
   */
  async eliminar(id) {
    // Cargamos el usuario antes de borrarlo, para poder informar al
    // cliente a quien se elimino (y lanzar 404 si no existe).
    const usuario = await this.obtenerPorId(id, { incluirRelaciones: false });

    const resumen = await db.conTransaccion(async (conexion) => {
      // Dentro de la transaccion usamos `conexion.execute`, NO
      // `db.ejecutar`. Si usaramos db.ejecutar, cada consulta tomaria
      // una conexion distinta del pool y la transaccion no las cubriria.
      const [borradoPerfiles] = await conexion.execute(
        'DELETE FROM PERFIL_SOCIAL WHERE USUARIO_id = ?',
        [id]
      );

      const [borradoTelefonos] = await conexion.execute(
        'DELETE FROM TELEFONO WHERE USUARIO_id = ?',
        [id]
      );

      await conexion.execute('DELETE FROM USUARIO WHERE id = ?', [id]);

      // affectedRows dice cuantas filas elimino cada DELETE.
      return {
        perfilesEliminados: borradoPerfiles.affectedRows,
        telefonosEliminados: borradoTelefonos.affectedRows
      };
    });

    return {
      id: usuario.id,
      nombreCompleto: usuario.obtenerNombreCompleto(),
      ...resumen
    };
  }

  /**
   * Comprueba si existe un usuario con ese id.
   * Lo usan los otros services (telefono, perfilSocial) para validar
   * la llave foranea ANTES de insertar y poder dar un mensaje claro.
   *
   * Nota: consultamos `SELECT 1` y no `SELECT *`, porque no nos
   * interesan los datos, solo si hay fila o no.
   *
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async existe(id) {
    const fila = await db.obtenerUno('SELECT 1 AS existe FROM USUARIO WHERE id = ?', [id]);
    return fila !== null;
  }
}

// SINGLETON: una sola instancia compartida por toda la aplicacion.
module.exports = new UsuarioService();
