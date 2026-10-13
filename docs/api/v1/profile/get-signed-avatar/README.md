# Obtener mi foto de perfil firmada

## Endpoint

```http
GET /api/v1/profile/avatar
Cookie: arpa_session=<token>
```

Requiere una sesión activa. Recupera la clave privada asociada al perfil autenticado y genera una URL de lectura firmada con cinco minutos de vigencia. Sin cookie válida responde `401`; si el usuario no tiene foto responde `404`.

```json
{
  "url": "https://arpa.nyc3.digitaloceanspaces.com/profiles/66f.../avatar/uuid.webp?X-Amz-Signature=...",
  "expiresAt": "2026-10-11T18:05:00.000Z"
}
```

En BIAN corresponde a `Party Reference Data Directory` con el action term `Retrieve`.
