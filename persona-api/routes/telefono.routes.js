/**
 * routes/telefono.routes.js
 * ---------------------------------------------------------------------
 * CAPA DE RUTAS de la entidad Telefono.
 *
 * TABLA DE ENDPOINTS
 * ---------------------------------------------------------------------
 * GET    /api/telefonos                  Lista con filtros y paginacion
 * GET    /api/telefonos/:id              Detalle
 * POST   /api/telefonos                  Crear (usuarioId en el cuerpo)
 * PUT    /api/telefonos/:id              Actualizar
 * PATCH  /api/telefonos/:id/activar      Poner activo = 1
 * PATCH  /api/telefonos/:id/desactivar   Poner activo = 0
 * DELETE /api/telefonos/:id              Eliminar
 * ---------------------------------------------------------------------
 *
 * Fijate en las rutas PATCH: son "acciones" sobre el recurso. REST
 * puro preferiria PUT con el cuerpo { "activo": 0 }, pero exponer la
 * accion explicita hace la API mas clara para quien la consume y es
 * una practica muy extendida.
 */

const express = require('express');

const telefonoController = require('../controllers/telefono.controller');
const { validarIdNumerico, exigirCuerpo } = require('../middleware/validarParametros');

const router = express.Router();

// ---- Coleccion ----
router.get('/', telefonoController.listar);
router.post('/', exigirCuerpo, telefonoController.crear);

// ---- Acciones (antes de '/:id' para que no las capture) ----
// cambiarEstado(true) devuelve el middleware ya configurado para activar.
router.patch('/:id/activar', validarIdNumerico('id'), telefonoController.cambiarEstado(true));
router.patch('/:id/desactivar', validarIdNumerico('id'), telefonoController.cambiarEstado(false));

// ---- Recurso individual ----
router.get('/:id', validarIdNumerico('id'), telefonoController.obtener);
router.put('/:id', validarIdNumerico('id'), exigirCuerpo, telefonoController.actualizar);
router.delete('/:id', validarIdNumerico('id'), telefonoController.eliminar);

module.exports = router;
