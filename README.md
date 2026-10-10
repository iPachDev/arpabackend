# ARPA Backend

API de ARPA construida con NestJS, MongoDB y Swagger.

## Configuración

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia el archivo de ejemplo y agrega los valores de tu entorno:

   ```bash
   cp .env.example .env
   ```

3. Asegúrate de que MongoDB esté disponible en la dirección indicada por `MONGODB_URI`.

## Desarrollo

```bash
npm run start:dev
```

Por defecto estarán disponibles:

- API: [http://localhost:3001/api/v1](http://localhost:3001/api/v1)
- Swagger: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- OpenAPI JSON: [http://localhost:3001/api/docs-json](http://localhost:3001/api/docs-json)

En producción configura `SWAGGER_ENABLED=false` salvo que la documentación tenga una protección adicional.

## Registro de usuarios

```http
POST /api/v1/users
```

La documentación detallada vive en [`docs/api/v1/users/create-user`](docs/api/v1/users/create-user/README.md).

## Autenticación y autorización

La API usa sesiones opacas persistidas en MongoDB y cookies `HttpOnly`. Todas las rutas están protegidas de forma predeterminada; `@Public()` habilita excepciones y `@Roles(...)` aplica RBAC con los roles `owner`, `editor` y `reader`.

Endpoints disponibles:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/sessions`
- `POST /api/v1/auth/logout`

## Perfil

Las rutas de perfil requieren sesión y están disponibles para `owner`, `editor` y `reader`:

- `GET /api/v1/profile`
- `PATCH /api/v1/profile`
- `PATCH /api/v1/profile/password`

Cada operación y sus esquemas están documentados en Swagger. La referencia detallada vive en [`docs/api/v1/profile`](docs/api/v1/profile).

## Equipos

Los equipos se persisten en MongoDB y el usuario que los crea queda registrado como `owner`:

- `POST /api/v1/teams`
- `GET /api/v1/teams/mine`
- `GET /api/v1/teams/{slug}`

La documentación detallada vive en [`docs/api/v1/teams`](docs/api/v1/teams) y Swagger identifica el dominio BIAN `Party Reference Data Directory`.

Para que la protección optimista de Next.js pueda leer la cookie, frontend y backend deben publicarse bajo el mismo host. Si se usan subdominios distintos, configura `SESSION_COOKIE_DOMAIN` conscientemente o utiliza un proxy inverso que publique la API bajo el host del frontend.

## Verificación

```bash
npm test
npm run test:e2e
npm run build
```
