# Personal Management

Aplicación full stack para administrar personas y sus datos de contacto, construida
como **material de enseñanza** de desarrollo web backend y frontend.

API REST con **Node.js + Express + MySQL** y frontend **vanilla** (HTML5, CSS, JS)
organizado con **Atomic Design** y un sistema de diseño basado en Material Design 3.

> **SENA · Ficha 3489088 · Análisis y Desarrollo de Software**
> Todo el código, los comentarios y la documentación están en español.

---

## Índice

- [Qué hace la aplicación](#qué-hace-la-aplicación)
- [Capturas](#capturas)
- [Arquitectura](#arquitectura)
- [Modelo de datos](#modelo-de-datos)
- [Requisitos](#requisitos)
- [Puesta en marcha](#puesta-en-marcha)
- [Estructura del repositorio](#estructura-del-repositorio)
- [API REST](#api-rest)
- [Frontend y Atomic Design](#frontend-y-atomic-design)
- [Pruebas](#pruebas)
- [Qué se aprende aquí](#qué-se-aprende-aquí)
- [Solución de problemas](#solución-de-problemas)
- [Decisiones de diseño](#decisiones-de-diseño)
- [Licencia](#licencia)

---

## Qué hace la aplicación

Administra cuatro entidades relacionadas:

| Entidad | Descripción | Relación |
|---|---|---|
| **USUARIO** | La persona: nombres, apellidos, nacimiento, ciudad, estado | — |
| **TELEFONO** | Sus teléfonos | 1 a N con USUARIO |
| **RED_SOCIAL** | Catálogo de redes (Facebook, Instagram, LinkedIn…) | — |
| **PERFIL_SOCIAL** | Qué usuario tiene perfil en qué red | **N a N** (tabla puente, llave primaria compuesta) |

Sobre las cuatro se puede **crear, consultar, actualizar y eliminar** (CRUD completo),
con filtros, búsqueda y paginación.

**Características destacadas**

- La **edad se calcula en el servidor** a partir de la fecha de nacimiento: la API nunca
  confía en la que envía el cliente.
- Eliminar un usuario borra sus teléfonos y perfiles **dentro de una transacción**
  (todo o nada).
- No se puede eliminar una red social que tenga perfiles asociados: la API responde
  `409 Conflict` explicando por qué.
- Un usuario **no puede** tener dos perfiles en la misma red: lo impide la llave
  primaria compuesta de MySQL.
- Validación en dos capas: inmediata en el navegador (comodidad) y definitiva en el
  servidor (seguridad).
- Tema claro/oscuro, diseño responsivo y accesibilidad (ARIA, navegación por teclado,
  `prefers-reduced-motion`).

---

## Capturas

**Escritorio · tema claro**

```
┌────────────────────────────────────────────────────────────────────────┐
│ 👥 Personal Management                        ● API conectada    ☾     │
├──────────────┬─────────────────────────────────────────────────────────┤
│ GESTIÓN      │  Usuarios                              [+ Nuevo usuario]│
│ ▸ Usuarios 5 │  Cada usuario corresponde a una fila de la tabla USUARIO│
│   Teléfonos 3│  ┌───────────────────────────────────────────────────┐  │
│              │  │ 🔍 Buscar...      [Todo estado ▾]  🗑 Limpiar  ⟳  │  │
│ CATÁLOGOS    │  └───────────────────────────────────────────────────┘  │
│   Redes    8 │  ID  NOMBRE COMPLETO        EDAD TELS PERF  ESTADO      │
│   Perfiles 4 │  5   Grace Brewster Hopper   119   1    1   ● Activo    │
│              │  6   Alan Mathison Turing    113   1    1   ● Activo    │
│              │  Mostrando 1-5 de 5 registros      10 ▾    1 de 1       │
└──────────────┴─────────────────────────────────────────────────────────┘
```

**Móvil (390px)** · la tabla se convierte en tarjetas apiladas, aparece el menú
hamburguesa y no hay desplazamiento horizontal.

---

## Arquitectura

Cada capa tiene **una sola** responsabilidad y solo habla con la siguiente.

```
NAVEGADOR                                 SERVIDOR
┌──────────────────────┐                 ┌──────────────────────────────┐
│  paginas/   vista    │                 │  routes/      ¿qué URL?      │
│       ↓              │                 │       ↓                      │
│  organismos/         │   HTTP / JSON   │  controllers/ entrada/salida │
│       ↓              │  ────────────▶  │       ↓                      │
│  servicios/  fetch   │                 │  services/    reglas negocio │
│       ↓              │  ◀────────────  │       ↓                      │
│  clienteApi.js       │                 │  models/      objetos POO    │
└──────────────────────┘                 │       ↓                      │
                                         │  config/database.js → MySQL  │
                                         └──────────────────────────────┘
      Capas transversales:  utils/ (formato, validación)
                            middleware/ (errores, logs)
```

**Regla que no se rompe:** un controlador jamás escribe SQL; un modelo jamás sabe que
existe HTTP.

### Dónde tocar cada cosa

| Si hay que cambiar… | Se toca… |
|---|---|
| El formato de la fecha en pantalla | `utils/fechas.js` o `utiles/formato.js` |
| La regla «la edad se calcula sola» | `services/usuario.service.js` |
| La URL de un endpoint | `routes/usuario.routes.js` |
| El código HTTP de una respuesta | `controllers/usuario.controller.js` |
| El color de los botones | `css/01-tokens/_colores.css` |

---

## Modelo de datos

```
┌─────────────────────┐
│      USUARIO        │
│ PK id               │◀──────┐
│    primer_nombre    │       │ 1 : N
│    segundo_nombre   │       │
│    primer_apellido  │  ┌────┴──────────────┐
│    segundo_apellido │  │     TELEFONO      │
│    fecha_nacimiento │  │ PK id             │
│    edad             │  │    numero_telefono│
│    ciudad_domicilio │  │    tipo_telefono  │
│    estado           │  │ FK USUARIO_id     │
└──────────┬──────────┘  │    activo         │
           │ 1 : N       └───────────────────┘
┌──────────▼────────────────────┐
│       PERFIL_SOCIAL           │  ◀── TABLA PUENTE
│ PK,FK RED_SOCIAL_id           │      llave primaria
│ PK,FK USUARIO_id              │      COMPUESTA
│       url_perfil              │
└──────────┬────────────────────┘
           │ N : 1
┌──────────▼──────────┐
│     RED_SOCIAL      │
│ PK id               │
│    nombre           │
│    url              │
└─────────────────────┘
```

Las llaves foráneas usan `ON DELETE NO ACTION`: MySQL **no** borra en cascada, por eso
el borrado se orquesta a mano dentro de una transacción.

Script original: [`parametrization/db_relational_model/DB_relational_model.sql`](parametrization/db_relational_model/DB_relational_model.sql)

---

## Requisitos

| Herramienta | Versión mínima | Por qué |
|---|---|---|
| **Node.js** | 18+ | Usa `node --watch`, campos privados `#` y `Object.hasOwn` |
| **MySQL** | 8+ | Llaves foráneas, transacciones y `utf8mb4` |
| Navegador moderno | — | Módulos ES, `<dialog>`, CSS Grid, `clamp()` |
| Python 3 *(opcional)* | — | Para servir el frontend con `http.server` |

Verificar:

```bash
node -v && npm -v && mysql --version
```

---

## Puesta en marcha

### 1 · Base de datos

Los tres scripts son **idempotentes**: se pueden ejecutar varias veces sin perder datos.

```bash
mysql -u root -p < persona-api/database/01_schema.sql        # esquema y tablas
mysql -u root -p < persona-api/database/02_usuario_app.sql   # usuario pm_user
mysql -u root -p < persona-api/database/03_datos_prueba.sql  # datos de ejemplo
```

Esto crea el esquema `personal_management` y el usuario **`pm_user` / `pm_pass_2026`**,
con permisos **solo** de `SELECT, INSERT, UPDATE, DELETE` sobre ese esquema
(principio de menor privilegio: la aplicación nunca se conecta como `root`).

> ⚠️ Cambia la contraseña de `pm_user` antes de usar esto fuera de tu máquina.

### 2 · Backend

```bash
cd persona-api
npm install
cp .env.example .env     # y ajusta las credenciales si cambiaste algo
npm run dev              # o: npm start
```

```
Verificando conexion con MySQL...
Conexion con MySQL establecida.

==============================================================
  persona-api  ·  API REST Personal Management
==============================================================
  Servidor       : http://localhost:3000
  Documentacion  : http://localhost:3000/api
  Estado salud   : http://localhost:3000/api/salud
  Base de datos  : personal_management @ localhost:3306
==============================================================
```

### 3 · Frontend

⚠️ **No abras `index.html` con doble clic.** Usa módulos ES, que el navegador bloquea
en el protocolo `file://`. Hay que servirlo por HTTP:

```bash
cd persona-frontend
python3 -m http.server 5500      # o: npx serve -l 5500
```

Abrir **http://localhost:5500**

> También sirve la extensión *Live Server* de VS Code: usa el puerto 5500, que ya está
> autorizado en `ORIGENES_PERMITIDOS` del `.env`.

### Resumen: tres terminales

| Terminal | Carpeta | Comando | Puerto |
|---|---|---|---|
| 1 | *(solo la primera vez)* | los tres `mysql -u root -p < …` | — |
| 2 | `persona-api` | `npm run dev` | 3000 |
| 3 | `persona-frontend` | `python3 -m http.server 5500` | 5500 |

---

## Estructura del repositorio

```
personal_management_fullstack/
├── README.md                   ← este archivo
├── step_by_step.md             ← guía de 52 pasos (5.888 líneas)
│
├── parametrization/            ← material de partida entregado
│   ├── db_relational_model/    ← el script SQL original
│   └── js_clases/              ← las clases POO de referencia
│
├── persona-api/                ← BACKEND  (37 archivos · 6.034 líneas)
│   ├── config/                 ← env.js · database.js · express.js
│   ├── controllers/            ← 4 controladores (entrada/salida HTTP)
│   ├── database/               ← 3 scripts SQL
│   ├── middleware/             ← errorHandler · logger · validarParametros
│   ├── models/                 ← Usuario · Telefono · RedSocial · PerfilSocial
│   ├── routes/                 ← definición de endpoints
│   ├── services/               ← reglas de negocio y SQL
│   ├── utils/                  ← constantes, mensajes, fechas, validación, cifrado
│   ├── .env / .env.example / .gitignore
│   ├── index.js                ← punto de entrada
│   └── package.json
│
└── persona-frontend/           ← FRONTEND (59 archivos · 10.626 líneas)
    ├── index.html
    ├── css/                    ← Atomic Design en 7 niveles
    │   ├── 01-tokens/          ← variables del sistema de diseño
    │   ├── 02-base/            ← reset y estilos base
    │   ├── 03-atomos/          ← botón, campo, etiqueta, icono, insignia…
    │   ├── 04-moleculas/       ← campo de formulario, tarjeta, paginador…
    │   ├── 05-organismos/      ← barra, navegación, tabla, modal, formulario
    │   ├── 06-plantillas/      ← panel de administración
    │   ├── 07-paginas/         ← ajustes puntuales
    │   └── main.css            ← único punto de entrada (@import ordenados)
    └── js/                     ← las MISMAS 5 capas del Atomic Design
        ├── config/ · utiles/ · servicios/
        ├── atomos/ · moleculas/ · organismos/ · plantillas/ · paginas/
        └── main.js
```

### Convención de nombres del frontend

```
a-  átomo        .a-boton
m-  molécula     .m-campo-formulario
o-  organismo    .o-tabla-datos
t-  plantilla    .t-panel-administracion
p-  página       .p-usuarios
```

Y dentro de cada componente, **BEM**:

```
.a-boton            ← bloque
.a-boton__icono     ← elemento   (__)
.a-boton--primario  ← modificador (--)
```

Al leer una clase sabes su nivel y **en qué archivo buscarla**: el de `.a-boton` es,
siempre, `css/03-atomos/_a-boton.css`.

---

## API REST

**URL base:** `http://localhost:3000/api`

### Formato de respuesta

Todas las respuestas comparten la misma forma, para que el frontend no tenga que
adivinar.

**Éxito**

```json
{
  "ok": true,
  "mensaje": "Usuario creado correctamente.",
  "datos": { "id": 7, "nombreCompleto": "Ada Lovelace", "edad": 210 },
  "meta": { "total": 5, "pagina": 1, "limite": 10, "totalPaginas": 1 }
}
```

**Error**

```json
{
  "ok": false,
  "error": {
    "codigo": "VALIDACION",
    "mensaje": "No se pudo crear el usuario porque hay datos invalidos.",
    "detalles": [
      { "campo": "primerApellido", "mensaje": "El campo \"primerApellido\" es obligatorio." }
    ]
  }
}
```

La API **nunca corta en el primer error**: devuelve todos los campos inválidos juntos.

### Endpoints

#### Servicio

| Verbo | Ruta | Descripción |
|---|---|---|
| `GET` | `/api` | Documento de descubrimiento |
| `GET` | `/api/salud` | Estado de la API y de la base de datos |

#### Usuarios

| Verbo | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/usuarios` | Lista con filtros y paginación |
| `GET` | `/api/usuarios/:id` | Detalle con teléfonos y perfiles |
| `POST` | `/api/usuarios` | Crear |
| `PUT` | `/api/usuarios/:id` | Actualizar (parcial) |
| `DELETE` | `/api/usuarios/:id` | Eliminar en cascada (transacción) |
| `GET` | `/api/usuarios/:id/telefonos` | Teléfonos del usuario |
| `POST` | `/api/usuarios/:id/telefonos` | Crear teléfono del usuario |
| `GET` | `/api/usuarios/:id/perfiles-sociales` | Perfiles del usuario |
| `POST` | `/api/usuarios/:id/perfiles-sociales` | Crear perfil del usuario |

Query: `?pagina=1&limite=20&estado=1&ciudad=Medellin&buscar=hopper`

#### Teléfonos

| Verbo | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/telefonos` | Lista con filtros |
| `GET` | `/api/telefonos/:id` | Detalle |
| `POST` | `/api/telefonos` | Crear |
| `PUT` | `/api/telefonos/:id` | Actualizar |
| `PATCH` | `/api/telefonos/:id/activar` | Poner `activo = 1` |
| `PATCH` | `/api/telefonos/:id/desactivar` | Poner `activo = 0` |
| `DELETE` | `/api/telefonos/:id` | Eliminar |

Query: `?usuarioId=5&activo=1&tipo=Celular&buscar=300`

#### Redes sociales

| Verbo | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/redes-sociales` | Lista con búsqueda |
| `GET` | `/api/redes-sociales/:id` | Detalle |
| `POST` | `/api/redes-sociales` | Crear |
| `PUT` | `/api/redes-sociales/:id` | Actualizar |
| `DELETE` | `/api/redes-sociales/:id` | Eliminar (**409** si tiene perfiles) |

#### Perfiles sociales — llave compuesta

La URL lleva **dos** segmentos, en el mismo orden que la `PRIMARY KEY` de la tabla:

```sql
PRIMARY KEY (RED_SOCIAL_id, USUARIO_id)  →  /api/perfiles-sociales/4/3
```

| Verbo | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/perfiles-sociales` | Lista |
| `GET` | `/api/perfiles-sociales/:redSocialId/:usuarioId` | Detalle |
| `POST` | `/api/perfiles-sociales` | Crear |
| `PUT` | `/api/perfiles-sociales/:redSocialId/:usuarioId` | Actualizar **solo** `urlPerfil` |
| `DELETE` | `/api/perfiles-sociales/:redSocialId/:usuarioId` | Eliminar |

> La llave compuesta identifica el recurso y es **inmutable**: cambiarla no es
> actualizar, es borrar y crear otro.

### Códigos de estado

| Código | Cuándo |
|---|---|
| `200` | Operación exitosa |
| `201` | Recurso creado (incluye cabecera `Location`) |
| `400` | Datos inválidos, id no numérico, cuerpo vacío o JSON mal formado |
| `404` | El recurso no existe, o la llave foránea apunta a algo inexistente |
| `409` | Conflicto: duplicado o integridad referencial |
| `500` | Error inesperado del servidor |

### Ejemplos con curl

```bash
# Estado de la API
curl -s http://localhost:3000/api/salud | python3 -m json.tool

# Listar con paginación
curl -s "http://localhost:3000/api/usuarios?limite=2" | python3 -m json.tool

# Crear  (la API ignora "edad" e "id": los calcula o los genera ella)
curl -s -X POST http://localhost:3000/api/usuarios \
  -H 'Content-Type: application/json' \
  -d '{"primerNombre":"  ada  ","primerApellido":"lovelace",
       "fechaNacimiento":"1815-12-10","ciudadDomicilio":"londres",
       "edad":999,"id":1}' | python3 -m json.tool

# Eliminar en cascada
curl -s -X DELETE http://localhost:3000/api/usuarios/7 | python3 -m json.tool
```

---

## Frontend y Atomic Design

Cinco niveles, de lo más pequeño a lo más grande. **Las mismas cinco carpetas en CSS y
en JavaScript.**

| Nivel | Qué es | Ejemplos |
|---|---|---|
| **1 · Átomos** | Lo más pequeño, indivisible | botón, campo, etiqueta, icono, insignia, cargador |
| **2 · Moléculas** | Grupo de átomos con UNA función | campo de formulario, tarjeta, notificación, paginador, estado vacío |
| **3 · Organismos** | Sección completa y autónoma | barra superior, navegación, tabla, modal, formulario, panel de detalle |
| **4 · Plantillas** | La estructura, sin contenido real | panel de administración |
| **5 · Páginas** | Una plantilla con contenido real | usuarios, teléfonos, redes, perfiles |

**La regla que sostiene el sistema:** una molécula **no** redefine el estilo de sus
átomos; solo los organiza en el espacio.

### La pirámide invertida (ITCSS)

```
01-tokens       442 líneas  ← afecta a TODO
02-base         310
03-atomos       686         ← se reutiliza en todas partes
04-moleculas    714
05-organismos  1194
06-plantillas   169
07-paginas      104         ← el más pequeño
```

Si `07-paginas` creciera mucho, sería la señal de que falta un componente reutilizable.

### Sistema de diseño

- **Material Design 3**: roles de color (`--color-primario`, `--color-sobre-primario`,
  `--color-contenedor-primario`), elevación en 6 niveles, esquinas redondeadas.
- **Tema claro/oscuro** por preferencia del sistema o elección manual, persistida en
  `localStorage`.
- **Tipografía fluida** con `clamp()` y **escala de espaciado de 4 puntos**.
- **Tipografía del sistema**: no descarga ninguna fuente, así que funciona sin internet.

### Accesibilidad

- `<table>`, `<dialog>`, `<fieldset>`, `<dl>` semánticos de verdad.
- `aria-invalid`, `aria-current="page"`, `aria-live`, `role="alert"`.
- Foco visible con `:focus-visible`, enlace «Saltar al contenido», foco atrapado y
  devuelto en los modales.
- El color **nunca** es el único indicador: toda insignia lleva texto.
- Respeta `prefers-reduced-motion`.

---

## Pruebas

El proyecto se verificó con dos suites automatizadas: **93 pruebas, todas en verde**.

| Suite | Qué cubre | Resultado |
|---|---|---|
| **API** (HTTP) | 53 pruebas sobre los 4 recursos: CRUD, filtros, paginación, 400, 404, 409, JSON mal formado, cascada | **53 / 53** |
| **Navegador** (Chromium real) | 40 pruebas: render, navegación, CRUD desde la interfaz, validación, tema, responsivo en 3 anchos, consola sin errores | **40 / 40** |

### Comprobación manual rápida

| Qué probar | Qué debe pasar |
|---|---|
| Carga inicial | La tabla se llena desde MySQL |
| Indicador de la barra | Punto verde, «API conectada» |
| «Nuevo usuario» → Guardar vacío | 4 errores, en el resumen y en cada campo |
| Escribir la fecha de nacimiento | La edad se calcula en vivo |
| Buscar «hopper» | Filtra tras ~400 ms (debounce) |
| Clic en una fila | Modal con teléfonos y perfiles |
| Tecla `Escape` | Cierra el modal |
| Eliminar un usuario | Avisa de las consecuencias y reporta lo borrado |
| Botón luna/sol | Cambia el tema y lo recuerda al recargar |
| Encoger a 390px | Tabla → tarjetas, aparece el menú hamburguesa |
| Apagar la API y recargar | Estado de error con lista de verificación |

---

## Qué se aprende aquí

### Base de datos
Modelo relacional · llaves foráneas · **llave primaria compuesta** · tabla puente N:N ·
integridad referencial · **transacciones** · **consultas parametrizadas** (anti inyección
SQL) · **subconsultas correlacionadas** · `JOIN` · el **problema N+1** · scripts
idempotentes · principio de menor privilegio

### Backend
Arquitectura en capas · POO con **atributos privados `#`** · getters y setters ·
herencia (`AppError extends Error`) · polimorfismo (`toJSON`) · métodos estáticos de
fábrica · **Singleton** · **pool de conexiones** · middlewares · manejo centralizado de
errores · validación acumulativa · **listas blancas** (anti *mass assignment*) ·
variables de entorno · CORS · apagado elegante

### Frontend
**Atomic Design** · BEM · ITCSS · tokens de diseño · Material Design 3 · tema
claro/oscuro · CSS Grid con áreas nombradas · diseño **móvil primero** ·
`minmax(0, 1fr)` · tabla responsiva con `attr()` · **módulos ES** · `fetch` con
`AbortController` · **debounce** · `<dialog>` nativo · accesibilidad · **los cuatro
estados** de una vista (cargando / vacío / error / con datos)

### La guía completa

**[`step_by_step.md`](step_by_step.md)** documenta la construcción en **52 pasos
ordenados por dependencia**, con cada comando y su salida real. Incluye el
[Paso 50](step_by_step.md#paso-50--errores-reales-encontrados-al-construir-esto), que
analiza **cuatro bugs reales** que aparecieron al construir el proyecto, y el
[Paso 52](step_by_step.md#paso-52--ejercicios-propuestos), con **18 ejercicios** en
cinco niveles de dificultad.

---

## Solución de problemas

<details>
<summary><strong>«No se pudo iniciar el servidor» al arrancar la API</strong></summary>

La API comprueba MySQL **antes** de abrir el puerto (*fail fast*) y muestra una lista de
verificación:

1. ¿El servidor MySQL está encendido? → `ps aux | grep mysqld`
2. ¿Existe la base de datos? → `mysql -u root -p -e "SHOW DATABASES;"`
3. ¿El usuario y la clave del `.env` son correctos? →
   `mysql -u pm_user -p -D personal_management -e "SHOW TABLES;"`
4. ¿Ejecutaste los tres scripts de `persona-api/database/`?
</details>

<details>
<summary><strong>El frontend se ve sin estilos o la consola dice «Failed to load module»</strong></summary>

Abriste `index.html` con doble clic. Los módulos ES están bloqueados en `file://`.
Sírvelo por HTTP:

```bash
cd persona-frontend && python3 -m http.server 5500
```
</details>

<details>
<summary><strong>«blocked by CORS policy» en la consola</strong></summary>

El origen desde el que sirves el frontend no está autorizado. Agrégalo a
`ORIGENES_PERMITIDOS` en `persona-api/.env` y **reinicia la API**:

```bash
ORIGENES_PERMITIDOS=http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000
```

⚠️ `http://localhost:5500` y `http://127.0.0.1:5500` son orígenes **distintos** para el
navegador. Hay que listar el que realmente usas.
</details>

<details>
<summary><strong>El punto de la barra superior está rojo</strong></summary>

La API no responde. El problema está en el **backend**, no en el frontend: revisa la
terminal donde corre `npm run dev`. El frontend reintenta cada 30 segundos.
</details>

<details>
<summary><strong>«Access denied for user 'pm_user'»</strong></summary>

El usuario no existe o la clave del `.env` no coincide. Vuelve a ejecutar:

```bash
mysql -u root -p < persona-api/database/02_usuario_app.sql
```
</details>

<details>
<summary><strong>Creé una red social y no aparece en el desplegable</strong></summary>

No debería pasar: `redSocial.servicio.js` invalida su cache en cada escritura. Si
ocurre, recarga la página y revisa que el método de escritura llame a
`#invalidarCache()`.
</details>

---

## Decisiones de diseño

Decisiones conscientes, con su motivo:

| Decisión | Motivo |
|---|---|
| **SQL a mano, sin ORM** | Un ORM esconde justo lo que hay que aprender: consultas, `JOIN` y transacciones |
| **Sin librería de validación** (joi, zod) | El objetivo es entender la validación, no delegarla |
| **Middleware de logs propio**, sin morgan | Se aprende cómo funciona un middleware por dentro |
| **Sin nodemon** | Node 18+ trae `--watch` |
| **Frontend sin framework** | Se ve el DOM, los eventos y el `fetch` sin capas intermedias |
| **`@import` en CSS**, sin empaquetador | En desarrollo muestra la arquitectura; para producción se concatenaría |
| **Tipografía del sistema** | Cero descargas, funciona sin internet |
| **`<dialog>` nativo** | Regala foco atrapado, `Escape` y velo, bien hechos |
| **Entidad `Usuario`, carpeta `persona-api`** | Respeta el script SQL entregado sin renombrar tablas |
| **Sin autenticación** | La tabla `USUARIO` no tiene columna de contraseña. `utils/cifrado.js` queda como referencia para el ejercicio 5.1 |

### Limitaciones conocidas

- **No hay autenticación ni autorización.** La API es pública: no la expongas a internet
  tal cual.
- **`url` y `url_perfil` son `VARCHAR(45)`**, corto para URLs reales. La API valida la
  longitud y da un mensaje claro en lugar de dejar fallar a MySQL.
- **La cache del catálogo de redes sociales vive en memoria** del navegador: se pierde al
  recargar, y es correcto que así sea.
- **El `.env` del repositorio trae credenciales de desarrollo.** En un proyecto real
  `.env` nunca se versiona (ya está en `.gitignore`); aquí se dejó visible con fines
  didácticos.

---

## Licencia

MIT. Material formativo de libre uso para fines educativos.

---

<div align="center">

**SENA · Ficha 3489088 · Análisis y Desarrollo de Software · 2026**

 [Modelo relacional](parametrization/db_relational_model/DB_relational_model.sql)

</div>
