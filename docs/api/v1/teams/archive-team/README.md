# Dar de baja un equipo

`DELETE /api/v1/teams/{slug}`

Realiza una baja lógica: cambia el estado a `archived`, registra quién y cuándo la realizó, conserva integrantes e historial, y cancela invitaciones pendientes.

## Confirmación

```json
{
  "confirmationName": "ARPA Racing Team"
}
```

El valor debe coincidir exactamente con el nombre actual.

## Seguridad y visibilidad

- Requiere la cookie de sesión HttpOnly.
- Solo el owner puede dar de baja el equipo.
- Los endpoints de listado, detalle, integrantes e invitaciones solo consultan equipos activos; por ello owner, editores y lectores dejan de verlo inmediatamente.

## BIAN

- Service Domain: `Party Reference Data Directory`
- Action Term: `Control`

Responde `204 No Content`. `ArchiveTeamDto` está documentado como schema en Swagger.
