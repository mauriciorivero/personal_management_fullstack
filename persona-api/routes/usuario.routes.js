/**
 * routes/usuario.routes.js
 * ---------------------------------------------------------------------
 * CAPA DE RUTAS de la entidad Usuario.
 *
 * QUE HACE UNA RUTA?
 * Declara el CONTRATO de la API: que verbo HTTP + que URL ejecuta que
 * controlador, y por que middlewares pasa antes.
 *
 * Es la "tabla de contenido" de la API. Cualquiera puede abrir este
 * archivo y saber en 20 segundos todo lo que la API permite hacer con
 * los usuarios.
 *
 * express.Router() crea un mini-aplicacion de rutas que luego se monta
 * en un prefijo. Al montarlo en '/api/usuarios', la ruta '/' de aqui
 * se convierte en '/api/usuarios'.
 *
 * EL ORDEN DE LAS RUTAS IMPORTA
 * Express evalua de arriba hacia abajo y se detiene en la PRIMERA que
 * coincide. Por eso las rutas mas especificas van ANTES de las
 * genericas. Si pusieramos '/:id' antes de '/:id/telefonos', la
 * peticion a /api/usuarios/5/telefonos nunca llegaria a su destino.
 *
 * TABLA DE ENDPOINTS
 * ---------------------------------------------------------------------
 * GET    /api/usuarios                       Lista con filtros y paginacion
 * GET    /api/usuarios/:id                   Detalle con relaciones
 * GET    /api/usuarios/:id/telefonos         Telefonos del usuario
 * GET    /api/usuarios/:id/perfiles-sociales Perfiles sociales del usuario
 * POST   /api/usuarios                       Crear usuario
 * POST   /api/usuarios/:id/telefonos         Crear telefono del usuario
 * POST   /api/usuarios/:id/perfiles-sociales Crear perfil del usuario
 * PUT    /api/usuarios/:id                   Actualizar usuario
 * DELETE /api/usuarios/:id                   Eliminar usuario y sus hijos
 * ---------------------------------------------------------------------
 */

const express = require('express');

const usuarioController = require('../controllers/usuario.controller');
const telefonoController = require('../controllers/telefono.controller');
const perfilSocialController = require('../controllers/perfilSocial.controller');
const { validarIdNumerico, exigirCuerpo } = require('../middleware/validarParametros');

const router = express.Router();

// ---------------------------------------------------------------------
// Coleccion: /api/usuarios
// ---------------------------------------------------------------------

// GET /api/usuarios
router.get('/', usuarioController.listar);

// POST /api/usuarios
// exigirCuerpo corre ANTES del controlador y rechaza los cuerpos vacios.
router.post('/', exigirCuerpo, usuarioController.crear);

// ---------------------------------------------------------------------
// Subrecursos (van ANTES de '/:id' por el orden de evaluacion)
// ---------------------------------------------------------------------

// GET /api/usuarios/:id/telefonos
router.get('/:id/telefonos', validarIdNumerico('id'), telefonoController.listarPorUsuario);

// POST /api/usuarios/:id/telefonos
router.post(
  '/:id/telefonos',
  validarIdNumerico('id'),
  exigirCuerpo,
  telefonoController.crearParaUsuario
);

// GET /api/usuarios/:id/perfiles-sociales
router.get(
  '/:id/perfiles-sociales',
  validarIdNumerico('id'),
  perfilSocialController.listarPorUsuario
);

// POST /api/usuarios/:id/perfiles-sociales
router.post(
  '/:id/perfiles-sociales',
  validarIdNumerico('id'),
  exigirCuerpo,
  perfilSocialController.crearParaUsuario
);

// ---------------------------------------------------------------------
// Recurso individual: /api/usuarios/:id
// ---------------------------------------------------------------------

// GET /api/usuarios/:id
router.get('/:id', validarIdNumerico('id'), usuarioController.obtener);

// PUT /api/usuarios/:id
router.put('/:id', validarIdNumerico('id'), exigirCuerpo, usuarioController.actualizar);

// DELETE /api/usuarios/:id
router.delete('/:id', validarIdNumerico('id'), usuarioController.eliminar);

module.exports = router;
