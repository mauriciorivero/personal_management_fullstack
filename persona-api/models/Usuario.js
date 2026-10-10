/**
 * models/Usuario.js
 * ---------------------------------------------------------------------
 * ENTIDAD Usuario -> tabla `USUARIO` de la base de datos.
 *
 * QUE ES UN MODELO EN ESTA ARQUITECTURA?
 * Es una clase que representa una fila de la tabla como un OBJETO de
 * JavaScript. No sabe nada de SQL ni de HTTP: solo guarda datos y
 * expone comportamiento propio del dominio.
 *
 * LOS CUATRO PILARES DE LA POO, APLICADOS AQUI:
 *
 *  1. ABSTRACCION    -> la clase describe que ES un usuario, sin
 *                       detalles de como se guarda.
 *  2. ENCAPSULAMIENTO-> los atributos llevan # (privados). Solo se
 *                       acceden por getters y setters. Nadie puede
 *                       hacer usuario.#edad = -5 desde afuera.
 *  3. HERENCIA       -> no se usa en esta clase (ver utils/AppError.js,
 *                       que si hereda de Error).
 *  4. POLIMORFISMO   -> toJSON() es el ejemplo: JSON.stringify() lo
 *                       llama automaticamente, sin saber que clase es.
 *
 * POR QUE PRIVADOS CON # Y NO _nombre?
 * El guion bajo es solo una CONVENCION: nada impide tocar el atributo.
 * El numeral # es sintaxis real de JavaScript: si intentas leerlo
 * desde afuera, el programa lanza un SyntaxError. Es privacidad de
 * verdad, verificada por el motor del lenguaje.
 */

const fechas = require('../utils/fechas');
const { ESTADO_USUARIO } = require('../utils/constants');

class Usuario {
  // ---- Declaracion de atributos privados ----
  // Se declaran arriba, fuera del constructor, para que la clase
  // documente de un vistazo que datos maneja.
  #id;
  #primerNombre;
  #segundoNombre;
  #primerApellido;
  #segundoApellido;
  #fechaNacimiento;
  #edad;
  #ciudadDomicilio;
  #estado;
  #telefonos;
  #perfilesSociales;

  // Conteos de las relaciones.
  //
  // Por que guardar un conteo si ya tenemos los arreglos?
  // Porque el LISTADO (GET /api/usuarios) no carga las relaciones
  // completas: seria carisimo traer los telefonos de 50 usuarios solo
  // para mostrar un numero. En su lugar, la consulta del listado trae
  // los conteos con una SUBCONSULTA CORRELACIONADA y los guardamos
  // aqui. El DETALLE (GET /api/usuarios/:id) si carga los arreglos.
  #totalTelefonos;
  #totalPerfilesSociales;

  /**
   * @param {number|null} id                Null cuando el usuario aun no se guardo.
   * @param {string}      primerNombre
   * @param {string|null} segundoNombre
   * @param {string}      primerApellido
   * @param {string|null} segundoApellido
   * @param {string}      fechaNacimiento   Formato AAAA-MM-DD.
   * @param {number}      edad              Anios cumplidos.
   * @param {string}      ciudadDomicilio
   * @param {number}      estado            1 activo, 0 inactivo.
   */
  constructor(
    id = null,
    primerNombre,
    segundoNombre = null,
    primerApellido,
    segundoApellido = null,
    fechaNacimiento,
    edad,
    ciudadDomicilio,
    estado = ESTADO_USUARIO.ACTIVO
  ) {
    this.#id = id;
    this.#primerNombre = primerNombre;
    this.#segundoNombre = segundoNombre;
    this.#primerApellido = primerApellido;
    this.#segundoApellido = segundoApellido;
    this.#fechaNacimiento = fechaNacimiento;
    this.#edad = edad;
    this.#ciudadDomicilio = ciudadDomicilio;
    this.#estado = estado;

    // Colecciones de las relaciones. Arrancan vacias y se llenan con
    // agregarTelefono() / agregarPerfilSocial().
    this.#telefonos = [];
    this.#perfilesSociales = [];

    // 0 hasta que el listado los informe o se carguen las relaciones.
    this.#totalTelefonos = 0;
    this.#totalPerfilesSociales = 0;
  }

  // =====================================================================
  // GETTERS Y SETTERS
  // ---------------------------------------------------------------------
  // Un getter se LEE como una propiedad: usuario.primerNombre
  // (sin parentesis), aunque por dentro sea un metodo.
  //
  // Los setters son el lugar natural para normalizar y proteger el
  // estado del objeto. Mira el setter de fechaNacimiento: recalcula la
  // edad solo. Asi es IMPOSIBLE que el objeto quede inconsistente.
  // =====================================================================

  get id() {
    return this.#id;
  }

  set id(valor) {
    this.#id = valor;
  }

  get primerNombre() {
    return this.#primerNombre;
  }

  set primerNombre(valor) {
    this.#primerNombre = valor;
  }

  get segundoNombre() {
    return this.#segundoNombre;
  }

  set segundoNombre(valor) {
    this.#segundoNombre = valor;
  }

  get primerApellido() {
    return this.#primerApellido;
  }

  set primerApellido(valor) {
    this.#primerApellido = valor;
  }

  get segundoApellido() {
    return this.#segundoApellido;
  }

  set segundoApellido(valor) {
    this.#segundoApellido = valor;
  }

  get fechaNacimiento() {
    // Siempre devolvemos el formato ISO corto, sin importar si por
    // dentro era un Date (MySQL) o un texto (JSON del cliente).
    return fechas.aFechaISO(this.#fechaNacimiento);
  }

  /**
   * Al cambiar la fecha de nacimiento, la edad se RECALCULA sola.
   * Esta es la ventaja concreta de usar setters en lugar de atributos
   * publicos: la regla de negocio vive dentro del objeto.
   */
  set fechaNacimiento(valor) {
    this.#fechaNacimiento = valor;

    const edadCalculada = fechas.calcularEdad(valor);
    if (edadCalculada !== null) {
      this.#edad = edadCalculada;
    }
  }

  get edad() {
    return this.#edad;
  }

  /**
   * El setter de edad existe para cargar datos que ya vienen de la
   * base. En el flujo normal la edad NO se asigna a mano: se deriva
   * de fechaNacimiento (ver el setter de arriba y recalcularEdad()).
   */
  set edad(valor) {
    this.#edad = valor;
  }

  get ciudadDomicilio() {
    return this.#ciudadDomicilio;
  }

  set ciudadDomicilio(valor) {
    this.#ciudadDomicilio = valor;
  }

  get estado() {
    return this.#estado;
  }

  set estado(valor) {
    this.#estado = valor;
  }

  /**
   * Devuelve una COPIA del arreglo de telefonos.
   *
   * Por que una copia y no el arreglo original?
   * Porque si devolvieramos la referencia, cualquiera podria hacer
   * `usuario.telefonos.push(basura)` y romper el encapsulamiento sin
   * pasar por agregarTelefono(). Devolver [...copia] protege el estado.
   */
  get telefonos() {
    return [...this.#telefonos];
  }

  get perfilesSociales() {
    return [...this.#perfilesSociales];
  }

  /**
   * Cantidad de telefonos del usuario.
   *
   * Si las relaciones estan cargadas (vista de detalle), el valor real
   * es la longitud del arreglo. Si no (vista de listado), devolvemos el
   * conteo que trajo la subconsulta. Un solo getter cubre los dos casos
   * y quien lo use no tiene que saber de donde viene el dato: eso es
   * encapsulamiento.
   */
  get totalTelefonos() {
    return this.#telefonos.length > 0 ? this.#telefonos.length : this.#totalTelefonos;
  }

  set totalTelefonos(valor) {
    this.#totalTelefonos = Number(valor) || 0;
  }

  /** Cantidad de perfiles sociales del usuario. */
  get totalPerfilesSociales() {
    return this.#perfilesSociales.length > 0
      ? this.#perfilesSociales.length
      : this.#totalPerfilesSociales;
  }

  set totalPerfilesSociales(valor) {
    this.#totalPerfilesSociales = Number(valor) || 0;
  }

  // =====================================================================
  // METODOS DE NEGOCIO
  // Comportamiento que pertenece al usuario mismo, no a la base de datos.
  // =====================================================================

  /**
   * Arma el nombre completo omitiendo los campos que son null.
   *
   *   "Grace", "Brewster", "Hopper", "Murray" -> "Grace Brewster Hopper Murray"
   *   "Alan", null, "Turing", null            -> "Alan Turing"
   *
   * @returns {string}
   */
  obtenerNombreCompleto() {
    // Metemos las cuatro partes en un arreglo y filtramos las vacias.
    // Boolean como funcion de filtro descarta null, undefined y "".
    return [
      this.#primerNombre,
      this.#segundoNombre,
      this.#primerApellido,
      this.#segundoApellido
    ]
      .filter(Boolean)
      .join(' ');
  }

  /** Apellidos concatenados, utiles para ordenar listados. */
  obtenerApellidos() {
    return [this.#primerApellido, this.#segundoApellido].filter(Boolean).join(' ');
  }

  /** true si el usuario esta activo (columna estado = 1). */
  estaActivo() {
    return this.#estado === ESTADO_USUARIO.ACTIVO;
  }

  /** Marca el usuario como activo. */
  activar() {
    this.#estado = ESTADO_USUARIO.ACTIVO;
  }

  /** Marca el usuario como inactivo (baja logica, no se borra la fila). */
  desactivar() {
    this.#estado = ESTADO_USUARIO.INACTIVO;
  }

  /**
   * Fuerza el recalculo de la edad desde la fecha de nacimiento.
   * El service la llama antes de cada INSERT y cada UPDATE para que la
   * columna `edad` nunca mienta.
   *
   * @returns {number} La edad recalculada.
   */
  recalcularEdad() {
    const edadCalculada = fechas.calcularEdad(this.#fechaNacimiento);

    // El operador ?? (nullish coalescing) usa el lado derecho solo si
    // el izquierdo es null o undefined. A diferencia de ||, el valor 0
    // SI se considera valido, lo cual importa con edades de bebes.
    this.#edad = edadCalculada ?? 0;

    return this.#edad;
  }

  /** Agrega un objeto Telefono a la coleccion interna. */
  agregarTelefono(telefono) {
    this.#telefonos.push(telefono);

    // Mantenemos el conteo sincronizado con el arreglo. Que el objeto
    // cuide su propia consistencia es la razon de ser de los metodos:
    // nadie de afuera puede dejar el estado a medias.
    this.#totalTelefonos = this.#telefonos.length;

    return this;
  }

  /** Agrega un objeto PerfilSocial a la coleccion interna. */
  agregarPerfilSocial(perfilSocial) {
    this.#perfilesSociales.push(perfilSocial);
    this.#totalPerfilesSociales = this.#perfilesSociales.length;
    return this;
  }

  /** Solo los telefonos cuya bandera `activo` es 1. */
  obtenerTelefonosActivos() {
    return this.#telefonos.filter((telefono) => telefono.esActivo());
  }

  /** Fecha de nacimiento en texto legible: "9 de diciembre de 1906". */
  obtenerFechaNacimientoLarga() {
    return fechas.aTextoLargo(this.#fechaNacimiento);
  }

  // =====================================================================
  // METODOS ESTATICOS (de fabrica)
  // ---------------------------------------------------------------------
  // Un metodo `static` pertenece a la CLASE, no a las instancias:
  //    Usuario.desdeFila(fila)   <- correcto
  //    miUsuario.desdeFila(fila) <- NO existe
  //
  // Los usamos como "constructores con nombre". El constructor de esta
  // clase recibe 9 parametros en orden; equivocarse de posicion es muy
  // facil. Estas fabricas reciben un OBJETO con nombres y arman la
  // instancia por nosotros.
  // =====================================================================

  /**
   * Construye un Usuario a partir de una fila de MySQL.
   * Traduce snake_case (primer_nombre) a camelCase (primerNombre).
   *
   * Este metodo es el "mapeador" entre el mundo de la base de datos y
   * el mundo de los objetos.
   *
   * @param {object} fila  Fila devuelta por el driver mysql2.
   * @returns {Usuario|null}
   */
  static desdeFila(fila) {
    if (!fila) return null;

    const usuario = new Usuario(
      fila.id,
      fila.primer_nombre,
      fila.segundo_nombre,
      fila.primer_apellido,
      fila.segundo_apellido,
      fechas.aFechaISO(fila.fecha_nacimiento),
      fila.edad,
      fila.ciudad_domicilio,
      fila.estado
    );

    // Columnas que solo llegan en el listado, desde las subconsultas
    // correlacionadas. En el detalle no vienen, y entonces los
    // conteos se deducen de los arreglos ya cargados.
    if (fila.total_telefonos !== undefined) {
      usuario.totalTelefonos = fila.total_telefonos;
    }

    if (fila.total_perfiles_sociales !== undefined) {
      usuario.totalPerfilesSociales = fila.total_perfiles_sociales;
    }

    return usuario;
  }

  /**
   * Construye un Usuario a partir del JSON que envia el cliente
   * (req.body ya normalizado por el service).
   *
   * @param {object} datos  Objeto con llaves en camelCase.
   * @returns {Usuario}
   */
  static desdeJSON(datos = {}) {
    return new Usuario(
      datos.id ?? null,
      datos.primerNombre,
      datos.segundoNombre ?? null,
      datos.primerApellido,
      datos.segundoApellido ?? null,
      datos.fechaNacimiento,
      datos.edad,
      datos.ciudadDomicilio,
      datos.estado ?? ESTADO_USUARIO.ACTIVO
    );
  }

  // =====================================================================
  // SERIALIZACION
  // =====================================================================

  /**
   * Convierte el objeto al formato de FILA que espera MySQL
   * (llaves en snake_case, fecha como DATETIME).
   *
   * Nota: no incluimos el `id` porque es AUTO_INCREMENT en el INSERT
   * y porque en el UPDATE viaja aparte, en el WHERE.
   *
   * @returns {object}
   */
  aFilaBaseDatos() {
    return {
      primer_nombre: this.#primerNombre,
      segundo_nombre: this.#segundoNombre,
      primer_apellido: this.#primerApellido,
      segundo_apellido: this.#segundoApellido,
      fecha_nacimiento: fechas.aFechaMySQL(this.#fechaNacimiento),
      edad: this.#edad,
      ciudad_domicilio: this.#ciudadDomicilio,
      estado: this.#estado
    };
  }

  /**
   * Convierte el objeto al JSON que viaja al frontend.
   *
   * JSON.stringify() busca y llama este metodo de forma automatica.
   * Gracias a eso, el controlador puede hacer simplemente
   * res.json(usuario) y los atributos PRIVADOS se publican de forma
   * controlada: nosotros decidimos exactamente que sale y que no.
   *
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.#id,
      primerNombre: this.#primerNombre,
      segundoNombre: this.#segundoNombre,
      primerApellido: this.#primerApellido,
      segundoApellido: this.#segundoApellido,
      nombreCompleto: this.obtenerNombreCompleto(),
      fechaNacimiento: this.fechaNacimiento,
      fechaNacimientoTexto: this.obtenerFechaNacimientoLarga(),
      edad: this.#edad,
      ciudadDomicilio: this.#ciudadDomicilio,
      estado: this.#estado,
      activo: this.estaActivo(),

      // Conteos: el frontend los usa en las columnas del listado y en
      // el aviso de consecuencias del dialogo de eliminacion.
      totalTelefonos: this.totalTelefonos,
      totalPerfilesSociales: this.totalPerfilesSociales,

      // Las relaciones se serializan en cascada: cada Telefono y cada
      // PerfilSocial tiene su propio toJSON().
      telefonos: this.#telefonos.map((telefono) => telefono.toJSON()),
      perfilesSociales: this.#perfilesSociales.map((perfil) => perfil.toJSON())
    };
  }
}

module.exports = Usuario;
