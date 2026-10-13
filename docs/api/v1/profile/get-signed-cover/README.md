# Obtener mi portada firmada

## Endpoint

```http
GET /api/v1/profile/cover
Cookie: arpa_session=<token>
```

Requiere una sesión activa. Recupera la clave privada asociada exclusivamente al perfil autenticado y genera una URL de lectura firmada con cinco minutos de vigencia. Sin cookie válida responde `401`; si el usuario no tiene portada responde `404`.

```json
{
  "url": "https://arpa.nyc3.digitaloceanspaces.com/profiles/66f.../cover/uuid.webp?X-Amz-Signature=...",
  "expiresAt": "2026-10-11T18:05:00.000Z"
}
```

Una URL prefirmada puede utilizarse por quien la posea hasta que expire, por lo que se usa una vigencia corta y nunca se entrega sin autenticar primero la sesión. Swagger documenta `PrivateResourceResponseDto`.

En BIAN corresponde a `Party Reference Data Directory` con el action term `Retrieve`.
