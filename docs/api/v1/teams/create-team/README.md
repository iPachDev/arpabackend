# Crear un equipo

## Endpoint

```http
POST /api/v1/teams
Content-Type: application/json
Cookie: arpa_session=<token>
```

Requiere autenticación y admite los roles globales `owner`, `editor` y `reader`. El usuario autenticado se registra automáticamente como `owner` del equipo; el cliente no puede enviar ni sustituir `ownerId`.

```json
{
  "name": "ARPA Racing Team",
  "discipline": "karting",
  "privacy": "private",
  "location": "Ciudad de México",
  "description": "Equipo enfocado en competencias regionales de karting."
}
```

Responde `201` con el equipo creado, su `slug`, `membershipRole: "owner"` y `memberCount: 1`.

La operación se documenta en Swagger con el esquema `CreateTeamDto`. Su correspondencia BIAN es `Party Reference Data Directory` con el término de acción `Register`, porque registra una organización y su asociación con el usuario.

