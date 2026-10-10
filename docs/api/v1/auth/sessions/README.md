# Consultar mis sesiones

## Endpoint

```http
GET /api/v1/auth/sessions
Cookie: arpa_session=...
```

Requiere autenticación. Roles permitidos: `owner`, `editor` y `reader`.

Devuelve las sesiones del usuario que todavía no alcanzan su fecha de expiración. Incluye sesiones revocadas para que la interfaz pueda mostrar el historial reciente y marca la sesión actual.

```json
[
  {
    "id": "66f84cbd29d229e491a23362",
    "userAgent": "Mozilla/5.0",
    "ipAddress": "127.0.0.1",
    "createdAt": "2026-09-27T12:00:00.000Z",
    "lastSeenAt": "2026-09-27T12:15:00.000Z",
    "expiresAt": "2026-10-04T12:00:00.000Z",
    "active": true,
    "current": true
  }
]
```

Esta colección prepara la revocación remota: posteriormente se puede exponer una operación que invoque `SessionsService.revokeById`, verificando siempre que la sesión pertenezca al usuario autenticado.
