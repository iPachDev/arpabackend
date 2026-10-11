# Actualizar un equipo

`PATCH /api/v1/teams/{slug}`

Actualiza nombre, disciplina, privacidad, ubicación, descripción, URL del logo y URL de portada. El `slug` permanece estable.

## Seguridad

- Requiere la cookie de sesión HttpOnly.
- Solo el owner del equipo puede actualizarlo.
- El equipo debe estar activo.
- Las imágenes aceptan únicamente URLs `http` o `https`.

## BIAN

- Service Domain: `Party Reference Data Directory`
- Action Term: `Update`

El request usa `UpdateTeamDto` y la respuesta `TeamResponseDto`, disponibles también como schemas en Swagger.
