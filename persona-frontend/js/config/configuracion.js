/**
 * js/config/configuracion.js
 * ---------------------------------------------------------------------
 * Configuracion global del frontend.
 *
 * Es el equivalente del archivo .env del backend. La diferencia es
 * importante y hay que entenderla bien:
 *
 *   EL FRONTEND NO TIENE SECRETOS.
 *
 * Todo lo que escribas aqui viaja al navegador y cualquiera lo puede
 * leer con F12. Por eso aqui SOLO van datos publicos: la URL de la
 * API, tiempos de espera, textos. Una contrasenia o una llave de API
 * privada jamas se ponen en el frontend: van en el backend.
 *
 * MODULOS ES (ECMAScript Modules)
 * ---------------------------------------------------------------------
 * Usamos `export` / `import`, la forma moderna y nativa de organizar
 * JavaScript en el navegador. Para que funcione hacen falta dos cosas:
 *
 *   1. <script type="module" src="js/main.js"></script>
 *   2. Servir los archivos por HTTP (con `npx serve` o Live Server).
 *
 * Si abres el index.html con doble clic (protocolo file://) los
 * modulos NO cargan: el navegador lo bloquea por la politica de
 * mismo origen. Es el error mas comun al empezar con modulos.
 */

export const CONFIGURACION = Object.freeze({
  /**
   * URL base de la API REST.
   *
   * Tiene que coincidir con el PUERTO del archivo .env del backend y
   * estar incluida en su variable ORIGENES_PERMITIDOS (CORS).
   */
  urlApi: 'http://localhost:3000/api',

  /**
   * Tiempo maximo de espera de una peticion, en milisegundos.
   * Sin un limite, si el servidor no responde el usuario se queda
   * mirando el spinner para siempre.
   */
  tiempoEsperaMs: 10_000,

  /** Registros por pagina en los listados. */
  limitePorPagina: 10,

  /** Opciones del selector de registros por pagina. */
  opcionesLimite: [5, 10, 20, 50],

  /** Cuanto dura visible una notificacion, en milisegundos. */
  duracionNotificacionMs: 5_000,

  /**
   * Retardo del "debounce" de la busqueda, en milisegundos.
   *
   * Sin debounce, escribir "hopper" dispara 6 peticiones (una por
   * letra). Con 400 ms, esperamos a que el usuario deje de teclear y
   * mandamos UNA sola. Es la optimizacion mas rentable de cualquier
   * buscador.
   */
  retardoBusquedaMs: 400,

  /** Clave de localStorage donde se guarda el tema elegido. */
  claveTema: 'persona-frontend-tema',

  /** Catalogo de tipos de telefono. Debe coincidir con
   *  utils/constants.js del backend (TIPOS_TELEFONO). */
  tiposTelefono: ['Celular', 'Fijo', 'Trabajo', 'Casa', 'Otro'],

  /** Longitud maxima de los VARCHAR(45) del modelo relacional. */
  longitudMaximaTexto: 45
});
