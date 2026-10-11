# Solicitar transferencia de propiedad de un equipo

`POST /api/v1/teams/{slug}/ownership-transfers`

Solo el propietario actual puede invitar a otro usuario activo de ARPA. La propiedad no cambia al enviar el correo: el destinatario debe aceptar mediante el enlace de un solo uso.

La API almacena únicamente el hash SHA-256 del token. La invitación vence según `TEAM_OWNERSHIP_TRANSFER_TTL_DAYS` y sólo puede existir una transferencia pendiente por equipo.

```json
{
  "email": "nuevo.owner@example.com"
}
```
