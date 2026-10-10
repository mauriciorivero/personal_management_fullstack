/**
 * routes/redSocial.routes.js
 * ---------------------------------------------------------------------
 * CAPA DE RUTAS de la entidad RedSocial.
 *
 * TABLA DE ENDPOINTS
 * ---------------------------------------------------------------------
 * GET    /api/redes-sociales       Lista con busqueda y paginacion
 * GET    /api/redes-sociales/:id   Detalle
 * POST   /api/redes-sociales       Crear
 * PUT    /api/redes-sociales/:id   Actualizar
 * DELETE /api/redes-sociales/:id   Eliminar (409 si tiene perfiles)
 * ---------------------------------------------------------------------
 *
 * CONVENCION DE NOMBRES REST: la URL usa el nombre del recurso en
 * PLURAL y en minusculas, con guiones para separar palabras
 * (kebab-case):
 *
 *   BIEN: /api/redes-sociales
 *   MAL:  /api/RedSocial  /api/redSociales  /api/obtenerRedesSociales
 *
 * La URL nombra COSAS (sustantivos), no acciones. La accion la indica
 * el verbo HTTP: GET lee, POST crea, PUT actualiza, DELETE borra.
 */

const express = require('express');

const redSocialController = require('../controllers/redSocial.controller');
const { validarIdNumerico, exigirCuerpo } = require('../middleware/validarParametros');

const router = express.Router();

router.get('/', redSocialController.listar);
router.post('/', exigirCuerpo, redSocialController.crear);

router.get('/:id', validarIdNumerico('id'), redSocialController.obtener);
router.put('/:id', validarIdNumerico('id'), exigirCuerpo, redSocialController.actualizar);
router.delete('/:id', validarIdNumerico('id'), redSocialController.eliminar);

module.exports = router;
