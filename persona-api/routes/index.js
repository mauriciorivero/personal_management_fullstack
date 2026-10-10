/**
 * routes/index.js
 * ---------------------------------------------------------------------
 * ENRUTADOR PRINCIPAL: junta todos los routers en un solo lugar y les
 * asigna su prefijo de URL.
 *
 * Gracias a este archivo, config/express.js solo necesita UNA linea
 * (app.use('/api', rutas)) en lugar de cuatro. Si manana agregas la
 * entidad "Direccion", la registras aqui y nada mas.
 *
 * COMO FUNCIONA router.use(prefijo, otroRouter)?
 * Monta un router hijo bajo un prefijo. La URL final es la suma de los
 * prefijos de toda la cadena:
 *
 *     app.use('/api', rutas)                      -> /api
 *       router.use('/usuarios', usuarioRoutes)    -> /api/usuarios
 *         router.get('/:id', ...)                 -> /api/usuarios/:id
 */

const express = require('express');

const usuarioRoutes = require('./usuario.routes');
const telefonoRoutes = require('./telefono.routes');
const redSocialRoutes = require('./redSocial.routes');
const perfilSocialRoutes = require('./perfilSocial.routes');

const db = require('../config/database');
const respuesta = require('../utils/respuesta');
const { capturarAsync } = require('../middleware/errorHandler');
const { ahoraISO } = require('../utils/fechas');

const router = express.Router();

// ---------------------------------------------------------------------
// GET /api  -> Documento de descubrimiento (discovery document)
// ---------------------------------------------------------------------
// Una buena API REST se describe a si misma: al entrar a la raiz,
// devuelve la lista de recursos disponibles. Asi quien la consume no
// tiene que adivinar las URL.
router.get('/', (req, res) => {
  return respuesta.exito(res, {
    mensaje: 'API REST Personal Management. Estos son los recursos disponibles.',
    datos: {
      nombre: 'persona-api',
      version: '1.0.0',
      recursos: {
        usuarios: '/api/usuarios',
        telefonos: '/api/telefonos',
        redesSociales: '/api/redes-sociales',
        perfilesSociales: '/api/perfiles-sociales'
      },
      utilidades: {
        estadoSalud: '/api/salud'
      }
    }
  });
});

// ---------------------------------------------------------------------
// GET /api/salud  -> Health check
// ---------------------------------------------------------------------
// Endpoint de monitoreo: verifica que la API responde Y que la base de
// datos esta accesible. En produccion lo consultan los balanceadores
// de carga para decidir si el servidor esta sano o hay que reiniciarlo.
router.get(
  '/salud',
  capturarAsync(async (req, res) => {
    // Si MySQL esta caido, verificarConexion lanza y el middleware de
    // errores responde 500 con un mensaje claro.
    await db.verificarConexion();

    return respuesta.exito(res, {
      mensaje: 'La API y la base de datos estan operativas.',
      datos: {
        api: 'activa',
        baseDatos: db.estaConectada ? 'conectada' : 'desconectada',

        // process.uptime() son los segundos que lleva corriendo el proceso.
        tiempoActivoSegundos: Math.floor(process.uptime()),
        marcaTiempo: ahoraISO()
      }
    });
  })
);

// ---------------------------------------------------------------------
// Montaje de los routers de cada entidad
// ---------------------------------------------------------------------
router.use('/usuarios', usuarioRoutes);
router.use('/telefonos', telefonoRoutes);
router.use('/redes-sociales', redSocialRoutes);
router.use('/perfiles-sociales', perfilSocialRoutes);

module.exports = router;
