/**
 * models/PerfilSocial.js
 * ---------------------------------------------------------------------
 * ENTIDAD PerfilSocial -> tabla `PERFIL_SOCIAL`.
 *
 * ESTA ES LA CLASE MAS INTERESANTE DEL MODELO. Presta atencion:
 *
 * 1. ES UNA TABLA PUENTE (o tabla de union).
 *    Un usuario puede estar en muchas redes sociales y una red social
 *    tiene muchos usuarios: es una relacion de MUCHOS A MUCHOS (N:N).
 *    Las bases de datos relacionales no pueden representar N:N
 *    directamente, asi que se parte en dos relaciones 1:N usando una
 *    tabla intermedia:
 *
 *        USUARIO  1 ---- N  PERFIL_SOCIAL  N ---- 1  RED_SOCIAL
 *
 * 2. SU LLAVE PRIMARIA ES COMPUESTA.
 *    PRIMARY KEY (RED_SOCIAL_id, USUARIO_id)
 *
 *    No tiene una columna `id` AUTO_INCREMENT. La identidad de la fila
 *    son las DOS llaves foraneas juntas. Consecuencias practicas:
 *
 *      - La URL del recurso lleva dos parametros:
 *          GET /api/perfiles-sociales/4/3
 *        (red social 4, usuario 3)
 *
 *      - La base de datos garantiza que un usuario NO pueda tener dos
 *        perfiles en la misma red social. Esa regla la impone MySQL,
 *        no nuestro codigo: es mucho mas confiable.
 *
 * 3. Igual que en Telefono, los atributos #redSocial y #usuario
 *    aceptan un id o la instancia completa, y los getters
 *    `redSocialId` / `usuarioId` normalizan ambos casos.
 */

class PerfilSocial {
  #redSocial;
  #usuario;
  #urlPerfil;

  /**
   * @param {number|RedSocial} redSocial  Id de la red social o la instancia.
   * @param {number|Usuario}   usuario    Id del usuario o la instancia.
   * @param {string|null}      urlPerfil  URL del perfil del usuario.
   */
  constructor(redSocial, usuario, urlPerfil = null) {
    this.#redSocial = redSocial;
    this.#usuario = usuario;
    this.#urlPerfil = urlPerfil;
  }

  // ------------------------- Getters y setters -------------------------

  get redSocial() {
    return this.#redSocial;
  }

  set redSocial(valor) {
    this.#redSocial = valor;
  }

  get usuario() {
    return this.#usuario;
  }

  set usuario(valor) {
    this.#usuario = valor;
  }

  get urlPerfil() {
    return this.#urlPerfil;
  }

  set urlPerfil(valor) {
    this.#urlPerfil = valor;
  }

  /**
   * Normaliza la mitad "red social" de la llave compuesta.
   * @returns {number|null}
   */
  get redSocialId() {
    return PerfilSocial.#extraerId(this.#redSocial);
  }

  /**
   * Normaliza la mitad "usuario" de la llave compuesta.
   * @returns {number|null}
   */
  get usuarioId() {
    return PerfilSocial.#extraerId(this.#usuario);
  }

  /**
   * Metodo PRIVADO y ESTATICO a la vez.
   *   - static  -> pertenece a la clase, no a la instancia.
   *   - #       -> solo se puede llamar desde dentro de la clase.
   *
   * Lo usamos para no repetir la misma logica de normalizacion en los
   * dos getters de arriba (principio DRY: Don't Repeat Yourself).
   *
   * @param {*} valor  Un id, una instancia o un objeto plano.
   * @returns {number|null}
   */
  static #extraerId(valor) {
    if (valor === null || valor === undefined) return null;

    if (typeof valor === 'object') {
      return valor.id ?? null;
    }

    const numero = Number(valor);
    return Number.isInteger(numero) ? numero : null;
  }

  // -------------------------- Metodos de negocio ------------------------

  /**
   * Devuelve la llave compuesta como texto, util para logs y para
   * usar como clave en un Map.
   *
   *   "4:3"  -> red social 4, usuario 3
   */
  obtenerClaveCompuesta() {
    return `${this.redSocialId}:${this.usuarioId}`;
  }

  /** true si las dos mitades de la llave compuesta estan presentes. */
  tieneClaveCompleta() {
    return this.redSocialId !== null && this.usuarioId !== null;
  }

  /**
   * Extrae el nombre de usuario (handle) desde la URL del perfil.
   *
   *   "https://www.instagram.com/adalovelace" -> "adalovelace"
   *
   * @returns {string|null}
   */
  obtenerNombreUsuarioPerfil() {
    if (!this.#urlPerfil) return null;

    try {
      const url = new URL(this.#urlPerfil);

      // pathname es "/adalovelace". Partimos por "/" y nos quedamos
      // con el ultimo segmento que no este vacio.
      const segmentos = url.pathname.split('/').filter(Boolean);

      // at(-1) devuelve el ultimo elemento del arreglo.
      return segmentos.length > 0 ? segmentos.at(-1) : null;
    } catch {
      return null;
    }
  }

  /**
   * Nombre de la red social, SOLO si #redSocial guarda la instancia
   * completa. Si guarda un id devuelve null.
   */
  obtenerNombreRed() {
    if (this.#redSocial !== null && typeof this.#redSocial === 'object') {
      return this.#redSocial.nombre ?? null;
    }
    return null;
  }

  // ---------------------------- Fabricas -------------------------------

  /**
   * Construye un PerfilSocial desde una fila de MySQL.
   *
   * Si la consulta trajo un JOIN con RED_SOCIAL (columnas red_nombre y
   * red_url), armamos la instancia de RedSocial para que el JSON de
   * salida sea mas rico. Asi el frontend no necesita una segunda
   * peticion para saber como se llama la red.
   *
   * @param {object} fila
   * @returns {PerfilSocial|null}
   */
  static desdeFila(fila) {
    if (!fila) return null;

    // Por defecto guardamos solo el id de la red social.
    let redSocial = fila.RED_SOCIAL_id;

    // Si la fila viene de un JOIN, construimos el objeto completo.
    if (fila.red_nombre !== undefined && fila.red_nombre !== null) {
      const RedSocial = require('./RedSocial');
      redSocial = new RedSocial(fila.RED_SOCIAL_id, fila.red_nombre, fila.red_url);
    }

    return new PerfilSocial(redSocial, fila.USUARIO_id, fila.url_perfil);
  }

  /** Construye un PerfilSocial desde el JSON del cliente. */
  static desdeJSON(datos = {}) {
    return new PerfilSocial(
      datos.redSocialId ?? datos.redSocial ?? null,
      datos.usuarioId ?? datos.usuario ?? null,
      datos.urlPerfil ?? null
    );
  }

  // -------------------------- Serializacion ----------------------------

  /** Formato de fila para MySQL (nombres reales de las columnas). */
  aFilaBaseDatos() {
    return {
      RED_SOCIAL_id: this.redSocialId,
      USUARIO_id: this.usuarioId,
      url_perfil: this.#urlPerfil
    };
  }

  /** Formato JSON para el frontend. */
  toJSON() {
    const salida = {
      redSocialId: this.redSocialId,
      usuarioId: this.usuarioId,
      urlPerfil: this.#urlPerfil,
      nombreUsuarioPerfil: this.obtenerNombreUsuarioPerfil(),
      claveCompuesta: this.obtenerClaveCompuesta()
    };

    // Solo agregamos los datos de la red si los tenemos cargados.
    const nombreRed = this.obtenerNombreRed();
    if (nombreRed !== null) {
      salida.redSocial = this.#redSocial.toJSON();
    }

    return salida;
  }
}

module.exports = PerfilSocial;
