/**
 * models/Telefono.js
 * ---------------------------------------------------------------------
 * ENTIDAD Telefono -> tabla `TELEFONO`.
 *
 * RELACION: un USUARIO tiene MUCHOS telefonos (1 a N).
 * En la base de datos esa relacion es la columna TELEFONO.USUARIO_id,
 * que es una LLAVE FORANEA hacia USUARIO.id.
 *
 * DETALLE DE DISENIO IMPORTANTE:
 * El atributo #usuario puede guardar dos cosas distintas:
 *   a) un NUMERO: el id del usuario (lo normal, viene del formulario);
 *   b) una INSTANCIA de Usuario: cuando queremos el objeto completo.
 *
 * Para que el resto del codigo no tenga que preguntar "que me dieron?",
 * el getter `usuarioId` NORMALIZA los dos casos y siempre devuelve un
 * numero. Ese es el valor de tener getters: esconden la complejidad.
 */

const { ESTADO_TELEFONO, TIPOS_TELEFONO } = require('../utils/constants');

class Telefono {
  #id;
  #numeroTelefono;
  #tipoTelefono;
  #usuario;
  #activo;

  /**
   * @param {number|null}        id
   * @param {string}             numeroTelefono
   * @param {string}             tipoTelefono    Celular, Fijo, Trabajo...
   * @param {number|Usuario}     usuario         Id del usuario o la instancia.
   * @param {number}             activo          1 activo, 0 inactivo.
   */
  constructor(
    id = null,
    numeroTelefono,
    tipoTelefono,
    usuario,
    activo = ESTADO_TELEFONO.ACTIVO
  ) {
    this.#id = id;
    this.#numeroTelefono = numeroTelefono;
    this.#tipoTelefono = tipoTelefono;
    this.#usuario = usuario;
    this.#activo = activo;
  }

  // ------------------------- Getters y setters -------------------------

  get id() {
    return this.#id;
  }

  set id(valor) {
    this.#id = valor;
  }

  get numeroTelefono() {
    return this.#numeroTelefono;
  }

  set numeroTelefono(valor) {
    this.#numeroTelefono = valor;
  }

  get tipoTelefono() {
    return this.#tipoTelefono;
  }

  set tipoTelefono(valor) {
    this.#tipoTelefono = valor;
  }

  /** Devuelve lo que se guardo: el id o la instancia de Usuario. */
  get usuario() {
    return this.#usuario;
  }

  set usuario(valor) {
    this.#usuario = valor;
  }

  /**
   * GETTER NORMALIZADOR: siempre devuelve el id del usuario como
   * numero, sin importar si #usuario guarda un id o un objeto Usuario.
   *
   * @returns {number|null}
   */
  get usuarioId() {
    if (this.#usuario === null || this.#usuario === undefined) {
      return null;
    }

    // Caso objeto: le pedimos su id (puede ser una instancia de Usuario
    // o un objeto plano con la propiedad id).
    if (typeof this.#usuario === 'object') {
      return this.#usuario.id ?? null;
    }

    // Caso valor simple: lo convertimos a numero.
    const numero = Number(this.#usuario);
    return Number.isInteger(numero) ? numero : null;
  }

  get activo() {
    return this.#activo;
  }

  set activo(valor) {
    this.#activo = valor;
  }

  // -------------------------- Metodos de negocio ------------------------

  /** true si la bandera `activo` vale 1. */
  esActivo() {
    return this.#activo === ESTADO_TELEFONO.ACTIVO;
  }

  /** Activa el telefono. */
  activar() {
    this.#activo = ESTADO_TELEFONO.ACTIVO;
    return this;
  }

  /** Desactiva el telefono sin borrar la fila (baja logica). */
  desactivar() {
    this.#activo = ESTADO_TELEFONO.INACTIVO;
    return this;
  }

  /** true si el tipo pertenece al catalogo de TIPOS_TELEFONO. */
  tieneTipoValido() {
    return TIPOS_TELEFONO.includes(this.#tipoTelefono);
  }

  /**
   * Version enmascarada del numero, para mostrar en pantalla sin
   * exponer el dato completo: "3001234567" -> "******4567"
   */
  obtenerNumeroEnmascarado() {
    // Requerimos el modulo aqui para que el modelo no cargue utilidades
    // de cifrado si nadie llama a este metodo.
    const { enmascarar } = require('../utils/cifrado');
    return enmascarar(this.#numeroTelefono, 4);
  }

  /** Etiqueta lista para la interfaz: "Celular: 3001234567". */
  obtenerEtiqueta() {
    const tipo = this.#tipoTelefono ?? 'Telefono';
    return `${tipo}: ${this.#numeroTelefono ?? 'sin numero'}`;
  }

  // ---------------------------- Fabricas -------------------------------

  /**
   * Construye un Telefono desde una fila de MySQL.
   * @param {object} fila
   * @returns {Telefono|null}
   */
  static desdeFila(fila) {
    if (!fila) return null;

    return new Telefono(
      fila.id,
      fila.numero_telefono,
      fila.tipo_telefono,
      fila.USUARIO_id,
      fila.activo
    );
  }

  /**
   * Construye un Telefono desde el JSON del cliente.
   * Acepta tanto `usuarioId` como `usuario` para ser tolerante con el
   * frontend.
   *
   * @param {object} datos
   * @returns {Telefono}
   */
  static desdeJSON(datos = {}) {
    return new Telefono(
      datos.id ?? null,
      datos.numeroTelefono,
      datos.tipoTelefono,
      datos.usuarioId ?? datos.usuario ?? null,
      datos.activo ?? ESTADO_TELEFONO.ACTIVO
    );
  }

  // -------------------------- Serializacion ----------------------------

  /** Formato de fila para MySQL (snake_case + nombre real de la FK). */
  aFilaBaseDatos() {
    return {
      numero_telefono: this.#numeroTelefono,
      tipo_telefono: this.#tipoTelefono,
      USUARIO_id: this.usuarioId,
      activo: this.#activo
    };
  }

  /** Formato JSON para el frontend. */
  toJSON() {
    return {
      id: this.#id,
      numeroTelefono: this.#numeroTelefono,
      numeroEnmascarado: this.obtenerNumeroEnmascarado(),
      tipoTelefono: this.#tipoTelefono,
      usuarioId: this.usuarioId,
      activo: this.#activo,
      esActivo: this.esActivo(),
      etiqueta: this.obtenerEtiqueta()
    };
  }
}

module.exports = Telefono;
