-- =====================================================================
-- 02_usuario_app.sql
-- Objetivo : Crear el usuario de MySQL que usara UNICAMENTE la API.
-- Por que  : Nunca se conecta una aplicacion con el usuario 'root'.
--            Si la API se ve comprometida, el atacante solo tendria
--            permisos sobre la base de datos personal_management.
--            Esto se llama "principio de menor privilegio".
-- Ejecutar : mysql -u root -p < 02_usuario_app.sql
-- =====================================================================

-- Creamos el usuario. 'localhost' significa que solo puede conectarse
-- desde la misma maquina donde corre MySQL.
CREATE USER IF NOT EXISTS 'pm_user'@'localhost' IDENTIFIED BY 'pm_pass_2026';

-- Le damos los permisos de datos (CRUD) sobre TODAS las tablas del esquema.
-- SELECT -> leer | INSERT -> crear | UPDATE -> actualizar | DELETE -> borrar
GRANT SELECT, INSERT, UPDATE, DELETE ON `personal_management`.* TO 'pm_user'@'localhost';

-- Recargamos la tabla de privilegios para que los cambios apliquen ya.
FLUSH PRIVILEGES;

-- Verificacion: debe listar los GRANT otorgados arriba.
SHOW GRANTS FOR 'pm_user'@'localhost';
