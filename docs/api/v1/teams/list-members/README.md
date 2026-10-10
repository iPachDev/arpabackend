# Consultar integrantes e invitaciones

## Endpoint

```http
GET /api/v1/teams/{slug}/members
Cookie: arpa_session=<token>
```

Devuelve el owner, integrantes aceptados e historial de invitaciones pendientes, expiradas, canceladas o fallidas. Solo pueden consultarlo usuarios que pertenezcan al equipo.

Swagger documenta una colección de `TeamRosterEntryDto`. La correspondencia BIAN es `Party Reference Data Directory / Retrieve`.

