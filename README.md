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

Para enviar invitaciones y avisos de inscripciones configura también:

```env
RESEND_API_KEY=
RESEND_FROM=ARPA <equipo@tu-dominio.com>
RESEND_CONTACT_TO=contacto@tu-dominio.com
FRONTEND_URL=http://localhost:3000
TEAM_OWNERSHIP_TRANSFER_TTL_DAYS=7
EVENT_OWNERSHIP_TRANSFER_TTL_DAYS=7
LOCATION_OWNERSHIP_TRANSFER_TTL_DAYS=7
```

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
- `PATCH /api/v1/teams/{slug}`
- `DELETE /api/v1/teams/{slug}`
- `GET /api/v1/teams/{slug}/members`
- `POST /api/v1/teams/{slug}/invitations`
- `GET /api/v1/team-invitations/{token}`
- `POST /api/v1/team-invitations/{token}/accept`

La documentación detallada vive en [`docs/api/v1/teams`](docs/api/v1/teams) y Swagger identifica el dominio BIAN `Party Reference Data Directory`.

La baja de un equipo es lógica: conserva sus datos e integrantes, registra la auditoría, cancela invitaciones pendientes y lo oculta para todos sus miembros.

## Eventos e inscripciones

Los eventos y sus inscripciones se persisten en colecciones separadas de MongoDB:

- `POST /api/v1/events`
- `GET /api/v1/events`
- `GET /api/v1/events/mine`
- `GET /api/v1/events/{slug}`
- `PATCH /api/v1/events/{slug}`
- `DELETE /api/v1/events/{slug}`
- `POST /api/v1/events/{slug}/ownership-transfers`
- `GET /api/v1/event-ownership-transfers/{token}`
- `POST /api/v1/event-ownership-transfers/{token}/accept`
- `POST /api/v1/events/{slug}/registrations`
- `DELETE /api/v1/events/{slug}/registrations/me`
- `GET /api/v1/event-registrations/mine`
- `GET /api/v1/notifications/mine`
- `PATCH /api/v1/notifications/{id}/read`

Los tres roles autenticados pueden crear eventos y editar únicamente los propios. Un evento admite una o varias fechas, cada una con horario y ubicación independientes. Su baja es lógica. La propiedad puede transferirse mediante una invitación de un solo uso enviada por Resend; el cambio ocurre únicamente cuando el usuario invitado la acepta. Las inscripciones respetan fecha límite, cupo y duplicados; su cancelación es lógica. Cada alta o cancelación crea una notificación persistente y envía un correo por Resend. Swagger documenta los mapeos BIAN `Promotional Events` y `Customer Event History`, además de todos los schemas.

Para que la protección optimista de Next.js pueda leer la cookie, frontend y backend deben publicarse bajo el mismo host. Si se usan subdominios distintos, configura `SESSION_COOKIE_DOMAIN` conscientemente o utiliza un proxy inverso que publique la API bajo el host del frontend.

## Ubicaciones

Las ubicaciones se guardan en MongoDB y el creador queda como propietario:

- `POST /api/v1/locations`
- `GET /api/v1/locations/mine`
- `GET /api/v1/locations/{slug}`
- `PATCH /api/v1/locations/{slug}`
- `DELETE /api/v1/locations/{slug}`
- `POST /api/v1/locations/{slug}/ownership-transfers`
- `GET /api/v1/location-ownership-transfers/{token}`
- `POST /api/v1/location-ownership-transfers/{token}/accept`

Las modificaciones y la baja lógica requieren propiedad del recurso. La transferencia usa una invitación de un solo uso por Resend. Swagger documenta autenticación, roles, schemas y el dominio BIAN `Location Data Management`; la referencia detallada vive en [`docs/api/v1/locations`](docs/api/v1/locations).

## Verificación

```bash
npm test
npm run test:e2e
npm run build
```
