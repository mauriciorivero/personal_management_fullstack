/**
 * js/servicios/clienteApi.js
 * ---------------------------------------------------------------------
 * CLIENTE HTTP: el unico lugar del frontend que habla con la API.
 *
 * POR QUE CENTRALIZAR TODAS LAS PETICIONES EN UNA CLASE?
 *
 * Imagina que cada pagina llamara a fetch() por su cuenta. Entonces,
 * cada una tendria que repetir:
 *   - la URL base,
 *   - la cabecera Content-Type,
 *   - el manejo del tiempo de espera,
 *   - la lectura del JSON,
 *   - la interpretacion del error.
 *
 * Y el dia que la API cambie de formato, habria que corregir 10
 * archivos. Con esta clase, se corrige UNO.
 *
 * Es el mismo razonamiento de config/database.js en el backend: un
 * unico punto de acceso al recurso externo.
 *
 * ADEMAS: aqui definimos la clase ErrorApi, que convierte la respuesta
 * de error del servidor en un objeto de JavaScript con el que el resto
 * de la aplicacion puede trabajar con comodidad.
 */

import { CONFIGURACION } from '../config/configuracion.js';

/**
 * Error propio de la capa de API.
 *
 * Igual que utils/AppError.js del backend, HEREDA de Error (extends)
 * y le agrega la informacion que necesitamos: el codigo HTTP, el
 * codigo interno y la lista de campos invalidos.
 *
 * Asi, un `catch` puede preguntar `error.esValidacion` en lugar de
 * analizar textos.
 */
export class ErrorApi extends Error {
  #estadoHttp;
  #codigo;
  #detalles;

  constructor(mensaje, estadoHttp = 0, codigo = 'DESCONOCIDO', detalles = []) {
    super(mensaje);

    this.name = 'ErrorApi';
    this.#estadoHttp = estadoHttp;
    this.#codigo = codigo;
    this.#detalles = Array.isArray(detalles) ? detalles : [];
  }

  get estadoHttp() {
    return this.#estadoHttp;
  }

  get codigo() {
    return this.#codigo;
  }

  get detalles() {
    return [...this.#detalles];
  }

  /** true si el error trae una lista de campos invalidos (HTTP 400). */
  get esValidacion() {
    return this.#codigo === 'VALIDACION' || this.#estadoHttp === 400;
  }

  /** true si el recurso no existe (HTTP 404). */
  get esNoEncontrado() {
    return this.#estadoHttp === 404;
  }

  /** true si choco con una regla de unicidad o integridad (HTTP 409). */
  get esConflicto() {
    return this.#estadoHttp === 409;
  }

  /**
   * true si nunca se pudo contactar al servidor.
   * estadoHttp vale 0 porque no hubo respuesta HTTP: la peticion no
   * llego a salir o el servidor no contesto.
   */
  get esSinConexion() {
    return this.#estadoHttp === 0;
  }
}

class ClienteApi {
  #urlBase;
  #tiempoEsperaMs;

  constructor(urlBase, tiempoEsperaMs) {
    this.#urlBase = urlBase;
    this.#tiempoEsperaMs = tiempoEsperaMs;
  }

  get urlBase() {
    return this.#urlBase;
  }

  /**
   * Construye la cadena de consulta (query string) a partir de un objeto.
   *
   *   { pagina: 2, buscar: 'hopper', ciudad: null }
   *   -> "?pagina=2&buscar=hopper"
   *
   * Dos detalles importantes:
   *   1. Omitimos los valores vacios, para no enviar "?ciudad=".
   *   2. Usamos URLSearchParams, que CODIFICA los caracteres
   *      especiales. Si el usuario busca "a&b", sin codificar el "&"
   *      partiria la URL y el parametro se perderia.
   *
   * @param {object} parametros
   * @returns {string}
   */
  #construirConsulta(parametros = {}) {
    const consulta = new URLSearchParams();

    for (const [clave, valor] of Object.entries(parametros)) {
      if (valor === null || valor === undefined || valor === '') continue;
      consulta.append(clave, String(valor));
    }

    const texto = consulta.toString();
    return texto === '' ? '' : `?${texto}`;
  }

  /**
   * Ejecuta una peticion HTTP y devuelve el cuerpo ya interpretado.
   *
   * @param {string} ruta      Ruta relativa, por ejemplo '/usuarios/5'.
   * @param {object} opciones  { metodo, cuerpo, parametros }
   * @returns {Promise<object>} El JSON de la respuesta.
   * @throws {ErrorApi}
   */
  async #peticion(ruta, opciones = {}) {
    const { metodo = 'GET', cuerpo = null, parametros = {} } = opciones;

    const url = `${this.#urlBase}${ruta}${this.#construirConsulta(parametros)}`;

    /**
     * TIEMPO DE ESPERA (timeout)
     *
     * fetch() no tiene opcion de timeout: si el servidor no responde,
     * la promesa queda pendiente para siempre y el usuario ve el
     * spinner eternamente.
     *
     * La solucion estandar es AbortController: creamos un
     * "controlador de cancelacion", le pasamos su senial a fetch y,
     * pasados N milisegundos, llamamos a abort(). Eso hace que fetch
     * rechace la promesa con un error de tipo AbortError.
     */
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), this.#tiempoEsperaMs);

    try {
      const configuracionPeticion = {
        method: metodo,
        headers: {
          Accept: 'application/json'
        },
        signal: controlador.signal
      };

      // Solo agregamos cuerpo y Content-Type si hay algo que enviar.
      // Un GET con cuerpo es invalido en HTTP.
      if (cuerpo !== null) {
        configuracionPeticion.headers['Content-Type'] = 'application/json';
        configuracionPeticion.body = JSON.stringify(cuerpo);
      }

      const respuesta = await fetch(url, configuracionPeticion);

      // ----- Interpretar el cuerpo -----
      // Una respuesta 204 (No Content) no tiene cuerpo: si
      // intentaramos leer el JSON, lanzaria una excepcion.
      let datos = null;

      if (respuesta.status !== 204) {
        const textoRespuesta = await respuesta.text();

        if (textoRespuesta !== '') {
          try {
            datos = JSON.parse(textoRespuesta);
          } catch {
            // El servidor respondio algo que no era JSON (por ejemplo
            // una pagina HTML de error de un proxy).
            throw new ErrorApi(
              'El servidor respondio en un formato que no se pudo interpretar.',
              respuesta.status,
              'RESPUESTA_INVALIDA'
            );
          }
        }
      }

      // ----- Interpretar el estado -----
      //
      // OJO, ESTO SORPRENDE A TODO EL MUNDO LA PRIMERA VEZ:
      // fetch() NO lanza error con un 404 ni con un 500. Solo falla si
      // la peticion no llego a salir (sin red, CORS, DNS).
      //
      // Por eso HAY que revisar respuesta.ok a mano. Es el error
      // numero uno al aprender fetch: se asume que un 500 cae en el
      // catch, y no es asi.
      if (!respuesta.ok) {
        const error = datos?.error ?? {};

        throw new ErrorApi(
          error.mensaje ?? `Error HTTP ${respuesta.status}`,
          respuesta.status,
          error.codigo ?? 'ERROR_HTTP',
          error.detalles ?? []
        );
      }

      return datos;
    } catch (error) {
      // Si ya es un ErrorApi, lo dejamos pasar tal cual.
      if (error instanceof ErrorApi) throw error;

      // El AbortController cancelo la peticion por tiempo de espera.
      if (error.name === 'AbortError') {
        throw new ErrorApi(
          `El servidor no respondio en ${this.#tiempoEsperaMs / 1000} segundos. Verifica que la API este encendida.`,
          0,
          'TIEMPO_AGOTADO'
        );
      }

      // TypeError es lo que lanza fetch cuando no hay red, el servidor
      // esta apagado o CORS bloqueo la peticion.
      throw new ErrorApi(
        'No se pudo conectar con la API. Revisa que el servidor este corriendo en ' +
          this.#urlBase +
          ' y que CORS permita este origen.',
        0,
        'SIN_CONEXION'
      );
    } finally {
      // Limpiamos el temporizador siempre, haya exito o error. Si no,
      // quedaria un setTimeout pendiente por cada peticion.
      clearTimeout(temporizador);
    }
  }

  // ---------------- Metodos publicos por verbo HTTP ----------------

  /** GET: leer. Es el unico verbo que lleva parametros de consulta. */
  obtener(ruta, parametros = {}) {
    return this.#peticion(ruta, { metodo: 'GET', parametros });
  }

  /** POST: crear. */
  crear(ruta, cuerpo) {
    return this.#peticion(ruta, { metodo: 'POST', cuerpo });
  }

  /** PUT: actualizar. */
  actualizar(ruta, cuerpo) {
    return this.#peticion(ruta, { metodo: 'PUT', cuerpo });
  }

  /** PATCH: modificacion parcial puntual. */
  modificar(ruta, cuerpo = {}) {
    return this.#peticion(ruta, { metodo: 'PATCH', cuerpo });
  }

  /** DELETE: eliminar. */
  eliminar(ruta) {
    return this.#peticion(ruta, { metodo: 'DELETE' });
  }

  /**
   * Comprueba si la API esta disponible.
   * Devuelve un booleano en vez de lanzar, porque es una consulta
   * informativa para el indicador de la barra superior.
   */
  async verificarSalud() {
    try {
      const respuesta = await this.obtener('/salud');
      return respuesta?.ok === true;
    } catch {
      return false;
    }
  }
}

// SINGLETON: una sola instancia para toda la aplicacion.
export const clienteApi = new ClienteApi(
  CONFIGURACION.urlApi,
  CONFIGURACION.tiempoEsperaMs
);
