# NovaSports - Panel Web de Administración

Panel web interno para administrar NovaSports: rankings de pádel, vínculos de jugadores con esos rankings, usuarios de la app y reportes de perfiles.

El panel no tiene base de datos ni lógica de negocio propia. Es un cliente "tonto" que consume la API de NovaSports (`/api/v1/admin/*`), la misma API que usa la app móvil. Todo lo que se cambia aquí (un ranking, un OVR, una suspensión) se refleja directamente en la app.

---

## Tabla de contenidos

1. [Requisitos](#requisitos)
2. [Levantar el proyecto](#levantar-el-proyecto)
3. [Variables de entorno](#variables-de-entorno)
4. [Scripts disponibles](#scripts-disponibles)
5. [Cómo se relaciona con la app móvil](#cómo-se-relaciona-con-la-app-móvil)
6. [Acceso de administradores](#acceso-de-administradores)
7. [Módulos del panel](#módulos-del-panel)
8. [Arquitectura del frontend](#arquitectura-del-frontend)
9. [Estructura de carpetas](#estructura-de-carpetas)
10. [Endpoints consumidos](#endpoints-consumidos)
11. [Despliegue](#despliegue)
12. [Problemas comunes](#problemas-comunes)

---

## Requisitos

- Node.js 18 o superior (recomendado 20 LTS).
- npm 9 o superior.
- Acceso a una instancia de la API de NovaSports (producción en Render o un backend local).
- Un correo con rol `admin` asignado en la base de datos (ver [Acceso de administradores](#acceso-de-administradores)).

---

## Levantar el proyecto

```bash
# 1. Clonar
git clone https://github.com/QueMASB233/novasports-panel-web.git
cd novasports-panel-web

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de entorno
cp .env.example .env

# 4. Arrancar en modo desarrollo
npm run dev
```

Vite levanta el panel en `http://localhost:5173`. Al entrar redirige a `/login`, donde se ingresa el correo de administrador y el código de 6 dígitos que llega por email.

Para generar y probar la versión de producción en local:

```bash
npm run build
npm run preview
```

---

## Variables de entorno

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `VITE_API_BASE_URL` | No | URL base de la API, incluyendo `/api/v1`. Si no se define, se usa `https://novasports-api.onrender.com/api/v1`. |

Ejemplos:

```bash
# Producción (Render)
VITE_API_BASE_URL=https://novasports-api.onrender.com/api/v1

# Backend local
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

Notas:

- Las variables `VITE_*` se inyectan en tiempo de build. Si se cambia el valor, hay que reiniciar `npm run dev` o volver a hacer `npm run build`.
- Si se apunta a un backend propio, ese backend debe permitir el origen del panel en `CORS_ORIGINS` (por ejemplo `http://localhost:5173`).
- El plan gratuito de Render duerme el servicio tras un rato sin uso. La primera petición puede tardar entre 30 y 60 segundos.

---

## Scripts disponibles

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo con recarga en caliente. |
| `npm run build` | Chequeo de tipos con `tsc -b` y build de producción en `dist/`. |
| `npm run preview` | Sirve el contenido de `dist/` para probar el build. |
| `npm run lint` | Ejecuta ESLint (requiere tener ESLint configurado). |

---

## Cómo se relaciona con la app móvil

NovaSports está compuesto por tres piezas:

```
+------------------+        +---------------------------+        +------------------+
|   App móvil      |        |   API NovaSports          |        |   Supabase       |
|   (jugadores,    | -----> |   Node/Express en Render  | -----> |   Postgres,      |
|   coaches,       |        |   /api/v1/*               |        |   Auth, Storage  |
|   clubes)        |        |   /api/v1/admin/*         |        |                  |
+------------------+        +---------------------------+        +------------------+
                                        ^
                                        |
                             +---------------------+
                             |   Panel web (este   |
                             |   repositorio)      |
                             +---------------------+
```

- La app móvil y el panel hablan con la misma API. El panel solo usa las rutas bajo `/admin/*`, protegidas por el middleware `requireAdmin` del backend.
- El panel nunca se conecta directamente a Supabase. El backend usa la `service_role` y aplica todas las reglas.
- El backend y la app viven en el repositorio principal de NovaSports (carpetas `backend/` y `mobile/`). El contrato completo de la API admin está documentado allí en `003 docs panel web.md`.

### Flujo de datos entre panel y app

**Rankings y OVR.** Los rankings que se cargan en el panel alimentan el onboarding del jugador en la app:

| Tipo (`ranking_type`) | Nombre en el panel | Campos obligatorios | Dónde aparece en la app |
|-----------------------|--------------------|---------------------|--------------------------|
| `national` | Nacional | `country` (ISO3) y `age_bracket` | Paso 3 del onboarding: búsqueda por país y categoría. |
| `country_open` | Open del país | `country` (ISO3) | Paso 4 del onboarding: torneos abiertos del país. |
| `fip` | Premier Padel | Ninguno (global) | Paso 4 del onboarding: ranking internacional. |
| `fip_promises` | FIP Promises | `fip_sub_category` (SUB12, SUB14, SUB16, SUB18) | Paso 4 del onboarding para jugadores de 18 años o menos. |

Cuando un jugador se vincula en la app a una entrada de un ranking, su OVR se calcula a partir de `ranking_position` usando las tablas de referencia que devuelve la API (`ovr_reference`). En rankings nacionales, `national_category` (1ra a 7ma) es solo informativa: se muestra en la app como `display_label`, pero no afecta al OVR.

**Auto-vínculos y verificación de identidad.** En la app, el jugador busca su nombre en un ranking y se auto-vincula. Al hacerlo:

1. El OVR se aplica de inmediato en su carta.
2. La app le pide una foto con su cédula y su rostro (se guarda en el bucket privado `ranking-id-verification`).
3. El check de verificación de la carta queda en gris hasta que un administrador revisa el vínculo en la sección Vínculos del panel.
4. El administrador puede aprobar (se marca `admin_verified_at` y el jugador pasa a verificado) o desvincular (se rompe el vínculo y se recalcula el OVR).

**Usuarios.** Los cambios de estado de cuenta tienen efecto inmediato en la app:

- `suspended`: requiere fecha de fin; el usuario no puede usar la app hasta esa fecha.
- `banned` / `blocked`: cierran la sesión del usuario.
- Override de OVR: fija un OVR manual que reemplaza al calculado. Al limpiarlo, el OVR vuelve a calcularse desde sus rankings.
- Logro "Mago": otorga o quita manualmente el logro especial del mago (varita) en el perfil del usuario.

**Reportes.** Desde la pantalla Buscar de la app, cualquier jugador, coach o club puede reportar un perfil. Esos reportes llegan a la cola de Reportes del panel, donde el administrador cambia el estado, deja notas y, si corresponde, aplica una acción sobre la cuenta denunciada.

---

## Acceso de administradores

No existe registro ni lista de correos en variables de entorno. El rol se asigna exclusivamente desde la base de datos (SQL Editor de Supabase):

```sql
SELECT grant_admin_role('persona@dominio.com');   -- otorgar
SELECT revoke_admin_role('persona@dominio.com');  -- quitar
```

El usuario debe existir previamente en Supabase Auth.

### Flujo de inicio de sesión

1. El administrador escribe su correo. El panel llama a `POST /admin/auth/send-code`. Por seguridad, la respuesta es la misma aunque el correo no sea admin.
2. Llega un código de 6 dígitos por email. El panel llama a `POST /admin/auth/verify-code` y recibe `{ session, admin }`.
3. La sesión (`access_token` y `refresh_token`) se guarda en `localStorage` bajo la clave `novasports.session`.
4. Cada petición envía `Authorization: Bearer <access_token>`.
5. Si la API responde 401, el cliente intenta refrescar con `POST /admin/auth/refresh` una sola vez y reintenta la petición. Si falla, se cierra la sesión y se vuelve a `/login`.
6. Si al usuario se le quita el rol admin, el refresh responde 403 y se le saca del panel.

---

## Módulos del panel

| Ruta | Sección | Qué permite |
|------|---------|-------------|
| `/login` | Login | Acceso por código OTP enviado al correo. |
| `/rankings` | Rankings | Listar, filtrar, crear, activar/desactivar y eliminar rankings. Los formularios se construyen con `GET /admin/rankings/meta`. |
| `/rankings/:id` | Editor de ranking | Ver, buscar, crear, editar y eliminar entradas. Importar CSV. Recalcular OVR de los atletas vinculados. |
| `/links` | Vínculos | Cola de auto-vínculos (pendientes, aprobados, todos). Ver foto de verificación, aprobar o desvincular. |
| `/users` | Usuarios | Buscar usuarios, cambiar estado de cuenta, fijar o limpiar override de OVR, otorgar el logro "Mago". |
| `/reports` | Reportes | Cola de reportes de perfiles con contador de pendientes en la barra superior. |
| `/reports/:id` | Detalle de reporte | Ver denunciante y denunciado, cambiar estado, notas internas y acción sobre la cuenta. |

### Importación CSV

En el editor de un ranking se puede pegar o cargar un CSV. El archivo se lee en el navegador con `FileReader` y se envía como texto a `POST /admin/rankings/:id/entries/import-csv`. Con la opción "reemplazar", las entradas actuales se borran antes de importar.

Columnas obligatorias:

- Nacional: `player_name`, `national_category`, `ranking_position`.
- Premier Padel, FIP Promises y Open del país: `player_name`, `ranking_position`.

El propio panel ofrece un botón para descargar un CSV de ejemplo por tipo; el formato exacto lo define la API en `csv_formats` dentro de `/admin/rankings/meta`.

### Foto de verificación

La foto se obtiene con `GET /admin/rankings/entries/:entryId/id-photo`, que devuelve una URL firmada válida por 1 hora. El panel no la guarda en caché: cada vez que se abre el modal se pide una URL nueva. Aprobar o desvincular no depende de que exista foto.

---

## Arquitectura del frontend

| Pieza | Tecnología |
|-------|-----------|
| Framework | React 18 con TypeScript |
| Bundler | Vite 5 |
| Rutas | React Router 6 |
| Estado del servidor | TanStack Query 5 |
| Estilos | Tailwind CSS 3 con tema oscuro propio |

Principios:

- **Cero lógica de negocio.** El panel no calcula OVR, no deriva scopes ni valida tipos de ranking. Las opciones de los formularios, las etiquetas, los formatos de CSV y las tablas de OVR vienen de los endpoints `meta`.
- **Un solo cliente HTTP.** `src/api/client.ts` concentra la URL base, el token, el refresh automático, el manejo de errores (`ApiError`) y las descargas autenticadas.
- **Endpoints tipados.** `src/api/endpoints.ts` agrupa las llamadas por dominio (`authApi`, `rankingsApi`, `entriesApi`, `linksApi`, `usersApi`, `reportsApi`) y `src/types.ts` define las formas de respuesta.
- **Formato de respuesta.** La API responde `{ success: true, data }` o `{ success: false, error: { code, message } }`. El cliente devuelve directamente `data` o lanza `ApiError` con el mensaje del backend, que se muestra en un toast.
- **Caché.** TanStack Query con `staleTime` de 30 segundos, un reintento y sin refetch al enfocar la ventana. Las mutaciones invalidan las queries afectadas (por ejemplo, aprobar un vínculo refresca la cola y los rankings).
- **Sesión global.** `AuthContext` hidrata la sesión al arrancar con `GET /admin/auth/me`. Las rutas protegidas usan un `Guard` que redirige a `/login`. Cuando el cliente detecta una sesión expirada emite el evento `novasports:signed-out` y el contexto vuelve al estado anónimo.

---

## Estructura de carpetas

```
.
├── index.html                 Punto de entrada HTML
├── public/                    Archivos estáticos (favicon)
├── src/
│   ├── main.tsx               Providers: QueryClient, Router, Toast, Auth
│   ├── App.tsx                Definición de rutas y guards
│   ├── api/
│   │   ├── client.ts          Cliente HTTP, sesión, refresh, descargas
│   │   └── endpoints.ts       Llamadas a /admin/* agrupadas por dominio
│   ├── auth/
│   │   └── AuthContext.tsx    Estado de sesión del administrador
│   ├── hooks/                 Hooks de datos compartidos (meta, reportes)
│   ├── layout/
│   │   └── AppLayout.tsx      Barra superior y navegación
│   ├── pages/                 Pantallas y modales de cada módulo
│   ├── ui/                    Componentes reutilizables (Modal, Toast, Badge...)
│   ├── styles/index.css       Estilos globales y clases utilitarias
│   └── types.ts               Tipos de las respuestas de la API
├── tailwind.config.js         Paleta y tipografía del panel
├── vite.config.ts             Configuración de Vite y alias "@" -> src
└── .env.example               Plantilla de variables de entorno
```

El alias `@` apunta a `src/`, por lo que los imports se escriben como `import { useAuth } from '@/auth/AuthContext'`.

---

## Endpoints consumidos

Todas las rutas son relativas a `VITE_API_BASE_URL`.

### Autenticación

| Método | Ruta |
|--------|------|
| POST | `/admin/auth/send-code` |
| POST | `/admin/auth/verify-code` |
| POST | `/admin/auth/refresh` |
| GET | `/admin/auth/me` |
| POST | `/admin/auth/logout` |

### Rankings y entradas

| Método | Ruta |
|--------|------|
| GET | `/admin/rankings/meta` |
| GET, POST | `/admin/rankings` |
| GET, PATCH, DELETE | `/admin/rankings/:id` |
| POST | `/admin/rankings/:id/recalc` |
| GET, POST | `/admin/rankings/:id/entries` |
| POST | `/admin/rankings/:id/entries/import-csv` |
| PATCH, DELETE | `/admin/rankings/entries/:entryId` |
| GET | `/admin/rankings/entries/:entryId/id-photo` |

### Vínculos

| Método | Ruta |
|--------|------|
| GET | `/admin/rankings/links/self?status=pending\|confirmed\|all&ranking_id=` |
| POST | `/admin/rankings/entries/:entryId/confirm` |
| POST | `/admin/rankings/entries/:entryId/unlink` |
| POST | `/admin/rankings/entries/:entryId/link` |

### Usuarios

| Método | Ruta |
|--------|------|
| GET | `/admin/users?q=&role=&account_status=&limit=&offset=` |
| PATCH | `/admin/users/:userId/account` |
| PATCH | `/admin/users/:userId/ovr` |
| PATCH | `/admin/users/:userId/wizard` |

### Reportes

| Método | Ruta |
|--------|------|
| GET | `/admin/reports/meta` |
| GET | `/admin/reports?status=&limit=&offset=` |
| GET, PATCH | `/admin/reports/:id` |

---

## Despliegue

El resultado de `npm run build` es un sitio estático en `dist/`, que se puede publicar en Vercel, Netlify, Render Static Sites, Cloudflare Pages o cualquier hosting estático.

Pasos generales:

1. Comando de build: `npm run build`.
2. Directorio de salida: `dist`.
3. Definir `VITE_API_BASE_URL` en las variables de entorno del proveedor.
4. Configurar un rewrite de todas las rutas a `/index.html`, porque el panel usa rutas del lado del cliente (`/rankings/:id`, `/reports/:id`). Sin esto, recargar una ruta interna devuelve 404.
5. Agregar el dominio del panel a `CORS_ORIGINS` en el backend si no está en `*`.

Ejemplo de rewrite en Vercel (`vercel.json`):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Ejemplo en Netlify (`public/_redirects`):

```
/*    /index.html   200
```

---

## Problemas comunes

**No llega el código de acceso.** El correo no tiene rol admin (la API responde igual para no revelarlo) o el usuario no existe en Supabase Auth. Revisar con `grant_admin_role`.

**Código válido pero error 403.** El OTP es correcto pero el usuario no tiene rol `admin` en `user_roles`.

**La primera carga tarda mucho.** El backend en Render estaba dormido. Esperar a que despierte y reintentar.

**Error de CORS en la consola.** El backend no tiene el origen del panel en `CORS_ORIGINS`.

**"Demasiadas solicitudes".** La API respondió 429 por límite de peticiones (por ejemplo, varios envíos de código seguidos). Esperar unos minutos.

**Cambié `VITE_API_BASE_URL` y no se aplica.** Reiniciar `npm run dev` o volver a ejecutar `npm run build`.

**Recargar una ruta interna en producción da 404.** Falta el rewrite a `index.html` en el hosting.
