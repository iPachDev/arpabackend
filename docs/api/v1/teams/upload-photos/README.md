# Subir fotos privadas de un equipo

## Endpoint

```http
POST /api/v1/teams/:slug/photos
Content-Type: multipart/form-data
Cookie: arpa_session=<token>

files=<imagen-1>
files=<imagen-2>
```

Permite cargar hasta seis fotos JPG, PNG o WebP de máximo 5 MB cada una. Requiere una sesión activa y que el usuario sea el `owner` del equipo.

Cada archivo se carga mediante el servicio reutilizable de almacenamiento con ACL `private`. MongoDB conserva únicamente las claves internas de los objetos y la respuesta contiene URLs firmadas con cinco minutos de vigencia:

```json
{
  "slug": "arpa-racing-team",
  "photoUrls": [
    "https://arpa.nyc3.digitaloceanspaces.com/teams/66f.../photos/uuid.webp?X-Amz-Signature=..."
  ]
}
```

Si falla cualquier carga o la persistencia, los objetos nuevos del lote se eliminan. Los archivos no son accesibles mediante una URL sin firma.

Swagger documenta el arreglo multipart y `TeamResponseDto`. En BIAN corresponde a `Party Reference Data Directory` con el action term `Update`.
