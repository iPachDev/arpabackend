# Invitar un integrante

## Endpoint

```http
POST /api/v1/teams/{slug}/invitations
Content-Type: application/json
Cookie: arpa_session=<token>
```

Solo el `owner` del equipo puede enviar invitaciones. La operación está limitada a diez intentos por hora.

```json
{
  "invitedName": "Mariana López",
  "email": "mariana@example.com",
  "sportsRole": "Piloto",
  "memberRole": "reader"
}
```

Genera un token aleatorio de un solo uso. MongoDB conserva únicamente su hash SHA-256 y mantiene el registro en `team_invitations`, incluso cuando el envío falla, expira o es aceptado. El enlace vence según `TEAM_INVITATION_TTL_DAYS`.

El correo se envía mediante Resend usando `RESEND_API_KEY`, `RESEND_FROM` y opcionalmente `RESEND_CONTACT_TO` como dirección de respuesta.

Swagger documenta `CreateTeamInvitationDto` y `TeamRosterEntryDto`. La correspondencia BIAN es `Party Reference Data Directory / Register`.

