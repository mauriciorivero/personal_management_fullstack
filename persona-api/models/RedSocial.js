/**
 * models/RedSocial.js
 * ---------------------------------------------------------------------
 * ENTIDAD RedSocial -> tabla `RED_SOCIAL`.
 *
 * Es una tabla de CATALOGO (tambien llamada tabla maestra o de
 * referencia): guarda una lista cerrada de valores que el resto del
 * sistema reutiliza. Aqui: Facebook, Instagram, TikTok, LinkedIn...
 *
 * Es la clase mas simple del proyecto, perfecta para entender la
 * estructura base de un modelo antes de pasar a las relaciones.
 */

class RedSocial {
  #id;
  #nombre;
  #url;

  /**
   * @param {number|null} id
   * @param {string}      nombre  Nombre comercial: "Instagram".
   * @param {string}      url     URL base: "https://www.instagram.com".
   */
  constructor(id = null, nombre, url) {
    this.#id = id;
    this.#nombre = nombre;
    this.#url = url;
  }

  // ------------------------- Getters y setters -------------------------

  get id() {
    return this.#id;
  }

  set id(valor) {
    this.#id = valor;
  }

  get nombre() {
    return this.#nombre;
  }

  set nombre(valor) {
    this.#nombre = valor;
  }

  get url() {
    return this.#url;
  }

  set url(valor) {
    this.#url = valor;
  }

  // -------------------------- Metodos de negocio ------------------------

  /**
   * Extrae el dominio de la URL: "https://www.instagram.com" -> "instagram.com"
   *
   * Usamos la clase URL nativa de JavaScript en lugar de cortar el
   * texto con split(), porque entiende puertos, rutas y parametros.
   * Va dentro de try/catch porque el constructor de URL lanza un
   * TypeError si el texto no es una URL valida.
   *
   * @returns {string|null}
   */
  obtenerDominio() {
    try {
      const url = new URL(this.#url);

      // hostname es "www.instagram.com". Quitamos el "www." inicial.
      return url.hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  }

  /**
   * Construye la URL de un perfil concatenando la URL base con un
   * nombre de usuario:
   *
   *   base "https://www.instagram.com" + "adalovelace"
   *   -> "https://www.instagram.com/adalovelace"
   *
   * @param {string} nombreUsuario
   * @returns {string|null}
   */
  construirURLPerfil(nombreUsuario) {
    if (!this.#url || !nombreUsuario) return null;

    const base = String(this.#url).replace(/\/+$/, '');
    const usuario = String(nombreUsuario).replace(/^\/+/, '');

    return `${base}/${usuario}`;
  }

  // ---------------------------- Fabricas -------------------------------

  /** Construye una RedSocial desde una fila de MySQL. */
  static desdeFila(fila) {
    if (!fila) return null;
    return new RedSocial(fila.id, fila.nombre, fila.url);
  }

  /** Construye una RedSocial desde el JSON del cliente. */
  static desdeJSON(datos = {}) {
    return new RedSocial(datos.id ?? null, datos.nombre, datos.url);
  }

  // -------------------------- Serializacion ----------------------------

  /** Formato de fila para MySQL. */
  aFilaBaseDatos() {
    return {
      nombre: this.#nombre,
      url: this.#url
    };
  }

  /** Formato JSON para el frontend. */
  toJSON() {
    return {
      id: this.#id,
      nombre: this.#nombre,
      url: this.#url,
      dominio: this.obtenerDominio()
    };
  }
}

module.exports = RedSocial;
