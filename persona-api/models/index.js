/**
 * models/index.js
 * ---------------------------------------------------------------------
 * "Barrel file" (archivo barril): reexporta todos los modelos desde un
 * solo punto de entrada.
 *
 * Sin el, cada service necesitaria varias lineas de require:
 *   const Usuario  = require('../models/Usuario');
 *   const Telefono = require('../models/Telefono');
 *
 * Con el, basta una:
 *   const { Usuario, Telefono } = require('../models');
 *
 * Nota: require('../models') encuentra este archivo solo porque se
 * llama index.js. Es la convencion de Node.js para el archivo
 * principal de una carpeta.
 */

const Usuario = require('./Usuario');
const Telefono = require('./Telefono');
const RedSocial = require('./RedSocial');
const PerfilSocial = require('./PerfilSocial');

module.exports = {
  Usuario,
  Telefono,
  RedSocial,
  PerfilSocial
};
