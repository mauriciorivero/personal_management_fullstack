/**
 * index.js
 * ---------------------------------------------------------------------
 * PUNTO DE ENTRADA de la aplicacion. Es el archivo que ejecuta
 * `node index.js` y, por lo tanto, lo primero que corre.
 *
 * SU UNICA RESPONSABILIDAD: el CICLO DE VIDA del servidor.
 *   1. Verificar que la base de datos responda.
 *   2. Crear la aplicacion Express.
 *   3. Ponerla a escuchar en un puerto.
 *   4. Apagarla de forma ordenada cuando toque.
 *
 * Observa que este archivo NO tiene rutas, NI consultas SQL, NI
 * validaciones. Solo enciende y apaga. Toda la configuracion vive en
 * config/express.js.
 */

const config = require('./config/env');
const db = require('./config/database');
const { crearAplicacion } = require('./config/express');
const { COLOR } = require('./middleware/logger');

/**
 * Imprime el banner de arranque con los datos utiles para el aprendiz.
 */
function mostrarBanner() {
  const linea = '='.repeat(62);

  console.log(`\n${COLOR.cian}${linea}${COLOR.reinicio}`);
  console.log(`${COLOR.cian}  persona-api  ·  API REST Personal Management${COLOR.reinicio}`);
  console.log(`${COLOR.cian}${linea}${COLOR.reinicio}`);
  console.log(`  Entorno        : ${config.entorno}`);
  console.log(`  Servidor       : http://localhost:${config.puerto}`);
  console.log(`  Documentacion  : http://localhost:${config.puerto}/api`);
  console.log(`  Estado salud   : http://localhost:${config.puerto}/api/salud`);
  console.log(`  Base de datos  : ${config.baseDatos.nombre} @ ${config.baseDatos.host}:${config.baseDatos.puerto}`);
  console.log(`  Usuario MySQL  : ${config.baseDatos.usuario}`);
  console.log(`  Origenes CORS  : ${config.origenesPermitidos.join(', ')}`);
  console.log(`${COLOR.cian}${linea}${COLOR.reinicio}`);
  console.log(`  ${COLOR.gris}Presiona Ctrl + C para detener el servidor${COLOR.reinicio}\n`);
}

/**
 * Arranca el servidor.
 *
 * Es `async` porque verificar la conexion a MySQL es una operacion
 * asincrona: hay que esperar la respuesta de la base de datos.
 */
async function iniciarServidor() {
  try {
    // ---- Paso 1: comprobar la base de datos ANTES de abrir el puerto ----
    //
    // Esto se llama "fail fast": si MySQL esta apagado, es mejor que el
    // servidor no arranque y lo digamos claramente, en lugar de
    // arrancar y fallar en la primera peticion de un usuario.
    console.log(`${COLOR.gris}Verificando conexion con MySQL...${COLOR.reinicio}`);
    await db.verificarConexion();
    console.log(`${COLOR.verde}Conexion con MySQL establecida.${COLOR.reinicio}`);

    // ---- Paso 2: crear la aplicacion ----
    const app = crearAplicacion();

    // ---- Paso 3: escuchar ----
    // app.listen devuelve el objeto servidor de Node, que guardamos
    // para poder cerrarlo despues de forma ordenada.
    const servidor = app.listen(config.puerto, () => {
      mostrarBanner();
    });

    // -------------------------------------------------------------------
    // APAGADO ELEGANTE (graceful shutdown)
    // -------------------------------------------------------------------
    //
    // Cuando pulsas Ctrl + C, el sistema operativo envia la senial
    // SIGINT. Si no la atendemos, Node muere de golpe y deja conexiones
    // a MySQL abiertas y peticiones a medio responder.
    //
    // Apagado elegante = dejar de aceptar peticiones nuevas, terminar
    // las que estan en curso, cerrar el pool y recien entonces salir.
    const apagar = async (senial) => {
      console.log(`\n${COLOR.amarillo}Senial ${senial} recibida. Cerrando el servidor...${COLOR.reinicio}`);

      // server.close deja de aceptar conexiones nuevas y espera a que
      // terminen las que ya estan en curso.
      servidor.close(async () => {
        try {
          await db.cerrar();
          console.log(`${COLOR.verde}Pool de MySQL cerrado. Hasta pronto.${COLOR.reinicio}\n`);
          process.exit(0);
        } catch (error) {
          console.error('Error al cerrar el pool:', error.message);
          process.exit(1);
        }
      });

      // Red de seguridad: si en 10 segundos no termino, salimos a la
      // fuerza. Evita que el proceso se quede colgado para siempre.
      setTimeout(() => {
        console.error('El cierre tardo demasiado. Forzando la salida.');
        process.exit(1);
      }, 10_000);
    };

    // SIGINT  -> Ctrl + C en la terminal.
    // SIGTERM -> lo envian Docker, Kubernetes o un gestor de procesos.
    process.on('SIGINT', () => apagar('SIGINT'));
    process.on('SIGTERM', () => apagar('SIGTERM'));

    return servidor;
  } catch (error) {
    // Si falla el arranque, mostramos un diagnostico util en vez de un
    // stack trace crudo que no le dice nada al aprendiz.
    console.error(`\n${COLOR.rojo}No se pudo iniciar el servidor.${COLOR.reinicio}`);
    console.error(`${COLOR.rojo}Motivo: ${error.message}${COLOR.reinicio}\n`);
    console.error('Lista de verificacion:');
    console.error('  1. El servidor MySQL esta encendido?');
    console.error(`  2. Existe la base de datos "${config.baseDatos.nombre}"?`);
    console.error(`  3. El usuario "${config.baseDatos.usuario}" y su clave son correctos en .env?`);
    console.error('  4. Ejecutaste los scripts de la carpeta database/?\n');

    process.exit(1);
  }
}

// -------------------------------------------------------------------
// RED DE SEGURIDAD GLOBAL
// -------------------------------------------------------------------

// Una promesa que se rechaza y nadie atrapa. Sin este manejador, Node
// imprime un aviso y en versiones modernas termina el proceso.
process.on('unhandledRejection', (razon) => {
  console.error(`\n${COLOR.rojo}[unhandledRejection] Promesa rechazada sin manejar:${COLOR.reinicio}`, razon);
});

// Una excepcion que escapo de todos los try/catch. Llegar aqui
// significa que el proceso quedo en un estado no confiable, asi que lo
// correcto es registrar y salir para que el gestor de procesos
// reinicie limpio.
process.on('uncaughtException', (error) => {
  console.error(`\n${COLOR.rojo}[uncaughtException] Error no capturado:${COLOR.reinicio}`, error);
  process.exit(1);
});

// Encendemos todo.
iniciarServidor();
