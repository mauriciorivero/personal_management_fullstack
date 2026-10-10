/**
 * routes/perfilSocial.routes.js
 * ---------------------------------------------------------------------
 * CAPA DE RUTAS de la entidad PerfilSocial (llave compuesta).
 *
 * TABLA DE ENDPOINTS
 * ---------------------------------------------------------------------
 * GET    /api/perfiles-sociales                            Lista
 * GET    /api/perfiles-sociales/:redSocialId/:usuarioId    Detalle
 * POST   /api/perfiles-sociales                            Crear
 * PUT    /api/perfiles-sociales/:redSocialId/:usuarioId    Actualizar urlPerfil
 * DELETE /api/perfiles-sociales/:redSocialId/:usuarioId    Eliminar
 * ---------------------------------------------------------------------
 *
 * COMO SE EXPRESA UNA LLAVE COMPUESTA EN UNA URL REST?
 * Con los dos valores como segmentos consecutivos, en el mismo orden
 * de la PRIMARY KEY de la tabla:
 *
 *     PRIMARY KEY (RED_SOCIAL_id, USUARIO_id)
 *          ->  /api/perfiles-sociales/4/3
 *
 * Y se registra validarIdNumerico DOS veces, una por parametro. Los
 * middlewares se ejecutan en cadena y de izquierda a derecha, asi que
 * cuando el controlador toma el control ya tiene los dos id validados
 * y convertidos a numero en req.idsValidados.
 */

const express = require('express');

const perfilSocialController = require('../controllers/perfilSocial.controller');
const { validarIdNumerico, exigirCuerpo } = require('../middleware/validarParametros');

const router = express.Router();

// ---- Coleccion ----
router.get('/', perfilSocialController.listar);
router.post('/', exigirCuerpo, perfilSocialController.crear);

// ---- Recurso individual con LLAVE COMPUESTA ----
router.get(
  '/:redSocialId/:usuarioId',
  validarIdNumerico('redSocialId'),
  validarIdNumerico('usuarioId'),
  perfilSocialController.obtener
);

router.put(
  '/:redSocialId/:usuarioId',
  validarIdNumerico('redSocialId'),
  validarIdNumerico('usuarioId'),
  exigirCuerpo,
  perfilSocialController.actualizar
);

router.delete(
  '/:redSocialId/:usuarioId',
  validarIdNumerico('redSocialId'),
  validarIdNumerico('usuarioId'),
  perfilSocialController.eliminar
);

module.exports = router;
