# Consultar un equipo propio

## Endpoint

```http
GET /api/v1/teams/{slug}
Cookie: arpa_session=<token>
```

Recupera un equipo activo por su `slug` para cualquier usuario autenticado.

- Un equipo `public` muestra nombre, descripción, ubicación, cantidad de integrantes y fotos firmadas.
- `allowNonMembers: false` muestra la información completa únicamente a integrantes. A otros usuarios les entrega nombre, logo y portada, junto con `isPrivateView: true`; descripción, ubicación, galería y cantidad de integrantes se ocultan.
- `showMembers: true` permite consultar nombres y roles de integrantes aceptados cuando el perfil también permite visitantes. Los correos y el historial de invitaciones nunca se entregan a visitantes.
- Ambas opciones tienen valor seguro `false` por defecto.
- `membershipRole` es `null` para visitantes. El roster y las acciones de edición continúan restringidos a integrantes y propietarios.

Si existen fotos visibles para el usuario, `photoUrls` contiene enlaces firmados con cinco minutos de vigencia. Las claves internas de DigitalOcean Spaces nunca se exponen.

Swagger documenta el parámetro `slug`, el esquema `TeamResponseDto`, la autenticación por cookie y los roles globales permitidos.

La correspondencia BIAN es `Party Reference Data Directory` con el término `Retrieve`.
