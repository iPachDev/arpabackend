# Cambiar mi foto de perfil

## Endpoint

```http
POST /api/v1/profile/avatar
Content-Type: multipart/form-data
Cookie: arpa_session=<token>

file=<imagen>
```

Requiere una sesión activa y acepta imágenes JPG, PNG o WebP de hasta 5 MB. El backend carga el archivo a DigitalOcean Spaces con ACL `private`, guarda únicamente la clave del objeto y devuelve una URL firmada con cinco minutos de vigencia.

```json
{
  "url": "https://arpa.nyc3.digitaloceanspaces.com/profiles/66f.../avatar/uuid.webp?X-Amz-Signature=...",
  "expiresAt": "2026-10-11T18:05:00.000Z"
}
```

Al reemplazar la foto se elimina el objeto anterior. Swagger documenta el archivo multipart y `PrivateResourceResponseDto`.

En BIAN corresponde a `Party Reference Data Directory` con el action term `Update`.
