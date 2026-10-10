# Aceptar una invitación

## Endpoint

```http
POST /api/v1/team-invitations/{token}/accept
Cookie: arpa_session=<token-de-sesion>
```

Requiere autenticación. El correo del usuario autenticado debe coincidir con el destinatario y la invitación debe seguir pendiente y vigente.

Al aceptar, el usuario se agrega a `members` dentro del equipo con el rol y permiso definidos; la invitación cambia a `accepted` y conserva quién y cuándo la aceptó. La operación es idempotente respecto a la membresía y nunca duplica al usuario.

Swagger documenta `AcceptTeamInvitationResponseDto`.

