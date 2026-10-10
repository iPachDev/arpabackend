# Consultar una invitación

## Endpoint

```http
GET /api/v1/team-invitations/{token}
```

Ruta pública utilizada por el enlace del correo. Devuelve únicamente el contexto necesario para mostrar el equipo, rol, permiso, vencimiento y si el correo todavía necesita registrarse.

El token funciona como secreto, no se registra en logs ni se almacena en texto plano. La respuesta usa `Cache-Control: no-store`.

Swagger documenta `TeamInvitationPreviewDto`.

