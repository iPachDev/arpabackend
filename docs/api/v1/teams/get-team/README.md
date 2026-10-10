# Consultar un equipo propio

## Endpoint

```http
GET /api/v1/teams/{slug}
Cookie: arpa_session=<token>
```

Recupera un equipo activo por su `slug`. La consulta queda limitada al usuario autenticado que aparece como `owner`; si no existe o pertenece a otra persona responde `404` para no revelar información privada.

Swagger documenta el parámetro `slug`, el esquema `TeamResponseDto`, la autenticación por cookie y los roles globales permitidos.

La correspondencia BIAN es `Party Reference Data Directory` con el término `Retrieve`.

