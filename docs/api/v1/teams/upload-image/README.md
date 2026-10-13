# Subir logo o portada privada de un equipo

## Endpoint

```http
POST /api/v1/teams/:slug/images/:kind
Content-Type: multipart/form-data
Cookie: arpa_session=<token>

file=<imagen>
```

`kind` acepta `logo` o `cover`. El archivo debe ser JPG, PNG o WebP y pesar máximo 5 MB. La operación requiere una sesión activa y que el usuario sea el `owner` del equipo.

Logo y portada usan el mismo método de carga privada. MongoDB guarda únicamente la clave interna y `TeamResponseDto` entrega `logoImageUrl` o `coverImageUrl` como URL firmada con cinco minutos de vigencia. Al reemplazar una imagen, el objeto anterior se elimina después de guardar correctamente la nueva clave.

Swagger documenta el parámetro `kind`, el archivo multipart y la respuesta. En BIAN corresponde a `Party Reference Data Directory` con el action term `Update`.
