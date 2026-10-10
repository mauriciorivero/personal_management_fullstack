/**
 * controllers/usuario.controller.js
 * ---------------------------------------------------------------------
 * CAPA DE CONTROLADOR de la entidad Usuario.
 *
 * SU UNICA RESPONSABILIDAD: traducir entre HTTP y el servicio.
 *
 *   ENTRADA : saca los datos de req (params, query, body).
 *   DELEGA  : llama al service, que es quien sabe las reglas.
 *   SALIDA  : arma la respuesta HTTP con el codigo correcto.
 *
 * REGLA PARA RECONOCER UN CONTROLADOR BIEN HECHO:
 * No debe contener NI UNA consulta SQL, NI UNA validacion de negocio,
 * NI UN calculo. Si ves un `SELECT` o un `if (edad > 18)` aqui, esa
 * logica esta en la capa equivocada.
 *
 * Un controlador "delgado" (thin controller) suele tener entre 3 y 8
 * lineas por metodo. Si crece, es sintoma de que se le esta metiendo
 * logica que pertenece al service.
 *
 * DE DONDE SALEN LOS DATOS DE LA PETICION?
 *   req.params -> de la ruta        /api/usuarios/7        -> { id: '7' }
 *   req.query  -> de la query       ?pagina=2&limite=10    -> { pagina: '2', ... }
 *   req.body   -> del cuerpo JSON   { "primerNombre": ... }
 *
 * OJO: req.params y req.query SIEMPRE traen TEXTO, nunca numeros.
 * Por eso el middleware validarIdNumerico ya nos dejo el id convertido
 * en req.idsValidados.
 */

const usuarioService = require('../services/usuario.service');
const respuesta = require('../utils/respuesta');
const MENSAJES = require('../utils/mensajes');
const { capturarAsync } = require('../middleware/errorHandler');

class UsuarioController {
  /**
   * GET /api/usuarios
   * Lista usuarios con filtros y paginacion.
   *
   * Query admitida: ?pagina=1&limite=20&estado=1&ciudad=Medellin&buscar=hopper
   *
   * Cada metodo se envuelve en capturarAsync: si el service lanza un
   * error, se va solo al middleware manejadorErrores. Por eso no hay
   * ni un try/catch en este archivo.
   */
  listar = capturarAsync(async (req, res) => {
    // Le pasamos la query completa al service; el decide que usar.
    const { usuarios, total, pagina, limite } = await usuarioService.listar(req.query);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.LISTA('usuarios'),

      // usuarios es un arreglo de objetos Usuario. Al serializar,
      // JSON.stringify llama al toJSON() de cada uno de forma
      // automatica: no hay que convertir nada a mano.
      datos: usuarios,

      meta: respuesta.construirMeta({
        total,
        pagina,
        limite,
        devueltos: usuarios.length
      })
    });
  });

  /**
   * GET /api/usuarios/:id
   * Devuelve un usuario con sus telefonos y perfiles sociales.
   */
  obtener = capturarAsync(async (req, res) => {
    // El id ya viene validado y convertido a numero por el middleware.
    const id = req.idsValidados.id;

    const usuario = await usuarioService.obtenerPorId(id);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.DETALLE('Usuario'),
      datos: usuario
    });
  });

  /**
   * POST /api/usuarios
   * Crea un usuario nuevo.
   *
   * Responde 201 Created, no 200. Es el codigo correcto cuando una
   * peticion crea un recurso nuevo en el servidor.
   */
  crear = capturarAsync(async (req, res) => {
    const usuario = await usuarioService.crear(req.body);

    // Cabecera Location: le dice al cliente en que URL quedo el
    // recurso recien creado. Es parte del estandar REST.
    res.set('Location', `/api/usuarios/${usuario.id}`);

    return respuesta.creado(res, {
      mensaje: MENSAJES.EXITO.CREADO('Usuario'),
      datos: usuario
    });
  });

  /**
   * PUT /api/usuarios/:id
   * Actualiza un usuario (acepta actualizaciones parciales).
   */
  actualizar = capturarAsync(async (req, res) => {
    const id = req.idsValidados.id;

    const usuario = await usuarioService.actualizar(id, req.body);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.ACTUALIZADO('Usuario'),
      datos: usuario
    });
  });

  /**
   * DELETE /api/usuarios/:id
   * Elimina el usuario junto con sus telefonos y perfiles sociales.
   *
   * Devolvemos 200 con un resumen de lo borrado en lugar de 204
   * (sin contenido), porque al aprendiz le sirve VER cuantas filas
   * relacionadas se eliminaron en la transaccion.
   */
  eliminar = capturarAsync(async (req, res) => {
    const id = req.idsValidados.id;

    const resumen = await usuarioService.eliminar(id);

    return respuesta.exito(res, {
      mensaje: MENSAJES.EXITO.ELIMINADO('Usuario'),
      datos: resumen
    });
  });
}

module.exports = new UsuarioController();
