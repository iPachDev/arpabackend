# Actualizar un equipo

`PATCH /api/v1/teams/{slug}`

Actualiza nombre, disciplina, privacidad, ubicación y descripción. El `slug` permanece estable. Las imágenes no se aceptan como URLs manuales: logo y portada se cargan mediante `POST /api/v1/teams/:slug/images/:kind`, y la galería mediante `POST /api/v1/teams/:slug/photos`.

La pestaña de privacidad utiliza `allowNonMembers` y `showMembers`. Ambos son booleanos opcionales y permanecen en `false` por defecto: el perfil queda restringido a integrantes y su listado no se publica. `showMembers` solo tiene efecto para visitantes cuando `allowNonMembers` también está activo.

## Seguridad

- Requiere la cookie de sesión HttpOnly.
- Solo el owner del equipo puede actualizarlo.
- El equipo debe estar activo.
- Los archivos de imagen se validan, almacenan de forma privada y se muestran mediante URLs firmadas temporales.

## BIAN

- Service Domain: `Party Reference Data Directory`
- Action Term: `Update`

El request usa `UpdateTeamDto` y la respuesta `TeamResponseDto`, disponibles también como schemas en Swagger.
