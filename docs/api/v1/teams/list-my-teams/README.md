# Consultar mis equipos

## Endpoint

```http
GET /api/v1/teams/mine
Cookie: arpa_session=<token>
```

Devuelve únicamente los equipos activos asociados al usuario autenticado, ordenados del más reciente al más antiguo. En esta primera versión la asociación corresponde a equipos creados por el usuario como `owner`.

La ruta requiere autenticación y admite `owner`, `editor` y `reader`. Swagger documenta una colección de `TeamResponseDto`, el requisito de cookie y los roles permitidos.

La correspondencia BIAN es `Party Reference Data Directory` con el término `Retrieve`.

