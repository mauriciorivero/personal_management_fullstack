-- =====================================================================
-- 01_schema.sql
-- Proyecto : Personal Management API
-- Objetivo : Crear el esquema y las 4 tablas del modelo relacional.
-- Origen   : parametrization/db_relational_model/DB_relational_model.sql
-- Nota     : El script es IDEMPOTENTE (usa IF NOT EXISTS), por lo tanto
--            se puede ejecutar varias veces sin borrar datos existentes.
-- Ejecutar : mysql -u root -p < 01_schema.sql
-- =====================================================================

-- Guardamos la configuracion original de la sesion para restaurarla al final.
SET @OLD_UNIQUE_CHECKS      = @@UNIQUE_CHECKS,      UNIQUE_CHECKS = 0;
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Esquema (base de datos) personal_management
-- utf8mb4 permite guardar acentos, enies y emojis.
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `personal_management`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `personal_management`;

-- ---------------------------------------------------------------------
-- Tabla USUARIO  (la "persona" del dominio)
-- Es la tabla padre: TELEFONO y PERFIL_SOCIAL dependen de ella.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `USUARIO` (
  `id`               INT          NOT NULL AUTO_INCREMENT,
  `primer_nombre`    VARCHAR(45)  NOT NULL,
  `segundo_nombre`   VARCHAR(45)  NULL,
  `primer_apellido`  VARCHAR(45)  NOT NULL,
  `segundo_apellido` VARCHAR(45)  NULL,
  `fecha_nacimiento` DATETIME     NOT NULL,
  `edad`             INT          NOT NULL,
  `ciudad_domicilio` VARCHAR(45)  NOT NULL,
  `estado`           INT          NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `id_UNIQUE` (`id` ASC) VISIBLE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Tabla TELEFONO  (relacion 1 a N con USUARIO)
-- Un usuario puede tener muchos telefonos; un telefono pertenece a uno.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `TELEFONO` (
  `id`              INT         NOT NULL AUTO_INCREMENT,
  `numero_telefono` VARCHAR(45) NULL,
  `tipo_telefono`   VARCHAR(45) NULL,
  `USUARIO_id`      INT         NOT NULL,
  `activo`          INT         NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_TELEFONO_USUARIO`
    FOREIGN KEY (`USUARIO_id`)
    REFERENCES `USUARIO` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Tabla RED_SOCIAL  (catalogo: Facebook, Instagram, TikTok, ...)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `RED_SOCIAL` (
  `id`     INT         NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(45) NOT NULL,
  `url`    VARCHAR(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Tabla PERFIL_SOCIAL  (tabla puente N a N entre RED_SOCIAL y USUARIO)
-- Su llave primaria es COMPUESTA: (RED_SOCIAL_id, USUARIO_id).
-- Esto significa que un usuario solo puede tener un perfil por red.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `PERFIL_SOCIAL` (
  `RED_SOCIAL_id` INT         NOT NULL,
  `USUARIO_id`    INT         NOT NULL,
  `url_perfil`    VARCHAR(45) NULL,
  PRIMARY KEY (`RED_SOCIAL_id`, `USUARIO_id`),
  CONSTRAINT `fk_RED_SOCIAL_has_USUARIO_RED_SOCIAL1`
    FOREIGN KEY (`RED_SOCIAL_id`)
    REFERENCES `RED_SOCIAL` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_RED_SOCIAL_has_USUARIO_USUARIO1`
    FOREIGN KEY (`USUARIO_id`)
    REFERENCES `USUARIO` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
) ENGINE = InnoDB;

-- Restauramos la configuracion original de la sesion.
SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS      = @OLD_UNIQUE_CHECKS;

-- Verificacion rapida.
SHOW TABLES;
