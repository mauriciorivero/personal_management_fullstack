-- =====================================================================
-- 03_datos_prueba.sql
-- Objetivo : Cargar datos de ejemplo (seed) para poder probar la API.
-- Nota     : Es IDEMPOTENTE. Usa INSERT ... SELECT ... WHERE NOT EXISTS,
--            asi que se puede correr varias veces sin duplicar filas
--            ni borrar informacion que ya exista.
-- Ejecutar : mysql -u root -p < 03_datos_prueba.sql
-- =====================================================================

USE `personal_management`;

-- ---------------------------------------------------------------------
-- Catalogo de redes sociales. La condicion NOT EXISTS evita duplicados
-- porque la columna 'nombre' no tiene indice UNIQUE en el modelo.
-- ---------------------------------------------------------------------
INSERT INTO `RED_SOCIAL` (`nombre`, `url`)
SELECT 'LinkedIn', 'https://www.linkedin.com'
WHERE NOT EXISTS (SELECT 1 FROM `RED_SOCIAL` WHERE `nombre` = 'LinkedIn');

INSERT INTO `RED_SOCIAL` (`nombre`, `url`)
SELECT 'X', 'https://www.x.com'
WHERE NOT EXISTS (SELECT 1 FROM `RED_SOCIAL` WHERE `nombre` = 'X');

INSERT INTO `RED_SOCIAL` (`nombre`, `url`)
SELECT 'GitHub', 'https://www.github.com'
WHERE NOT EXISTS (SELECT 1 FROM `RED_SOCIAL` WHERE `nombre` = 'GitHub');

-- ---------------------------------------------------------------------
-- Usuarios de ejemplo. Identificamos cada uno por nombre + apellido.
-- La columna 'edad' se guarda calculada; la API la recalcula siempre
-- a partir de 'fecha_nacimiento' (ver utils/fechas.js).
-- ---------------------------------------------------------------------
INSERT INTO `USUARIO`
  (`primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`,
   `fecha_nacimiento`, `edad`, `ciudad_domicilio`, `estado`)
SELECT 'Grace', 'Brewster', 'Hopper', 'Murray', '1906-12-09 00:00:00', 119, 'Nueva York', 1
WHERE NOT EXISTS (
  SELECT 1 FROM `USUARIO` WHERE `primer_nombre` = 'Grace' AND `primer_apellido` = 'Hopper'
);

INSERT INTO `USUARIO`
  (`primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`,
   `fecha_nacimiento`, `edad`, `ciudad_domicilio`, `estado`)
SELECT 'Alan', 'Mathison', 'Turing', NULL, '1912-06-23 00:00:00', 113, 'Londres', 1
WHERE NOT EXISTS (
  SELECT 1 FROM `USUARIO` WHERE `primer_nombre` = 'Alan' AND `primer_apellido` = 'Turing'
);

-- ---------------------------------------------------------------------
-- Telefonos de ejemplo. Buscamos el USUARIO_id con una subconsulta
-- en lugar de "adivinar" el id, porque el AUTO_INCREMENT puede variar.
-- ---------------------------------------------------------------------
INSERT INTO `TELEFONO` (`numero_telefono`, `tipo_telefono`, `USUARIO_id`, `activo`)
SELECT '3001234567', 'Celular', u.`id`, 1
FROM `USUARIO` u
WHERE u.`primer_nombre` = 'Grace' AND u.`primer_apellido` = 'Hopper'
  AND NOT EXISTS (SELECT 1 FROM `TELEFONO` t WHERE t.`numero_telefono` = '3001234567');

INSERT INTO `TELEFONO` (`numero_telefono`, `tipo_telefono`, `USUARIO_id`, `activo`)
SELECT '6045550101', 'Fijo', u.`id`, 1
FROM `USUARIO` u
WHERE u.`primer_nombre` = 'Alan' AND u.`primer_apellido` = 'Turing'
  AND NOT EXISTS (SELECT 1 FROM `TELEFONO` t WHERE t.`numero_telefono` = '6045550101');

-- ---------------------------------------------------------------------
-- Perfiles sociales de ejemplo (tabla puente con llave compuesta).
-- INSERT IGNORE evita el error 1062 (Duplicate entry) si ya existe.
-- ---------------------------------------------------------------------
INSERT IGNORE INTO `PERFIL_SOCIAL` (`RED_SOCIAL_id`, `USUARIO_id`, `url_perfil`)
SELECT r.`id`, u.`id`, 'https://www.linkedin.com/in/gracehopper'
FROM `RED_SOCIAL` r, `USUARIO` u
WHERE r.`nombre` = 'LinkedIn'
  AND u.`primer_nombre` = 'Grace' AND u.`primer_apellido` = 'Hopper';

INSERT IGNORE INTO `PERFIL_SOCIAL` (`RED_SOCIAL_id`, `USUARIO_id`, `url_perfil`)
SELECT r.`id`, u.`id`, 'https://www.github.com/aturing'
FROM `RED_SOCIAL` r, `USUARIO` u
WHERE r.`nombre` = 'GitHub'
  AND u.`primer_nombre` = 'Alan' AND u.`primer_apellido` = 'Turing';

-- Verificacion: conteo de filas por tabla.
SELECT 'USUARIO' AS tabla, COUNT(*) AS filas FROM `USUARIO`
UNION ALL SELECT 'TELEFONO',      COUNT(*) FROM `TELEFONO`
UNION ALL SELECT 'RED_SOCIAL',    COUNT(*) FROM `RED_SOCIAL`
UNION ALL SELECT 'PERFIL_SOCIAL', COUNT(*) FROM `PERFIL_SOCIAL`;
