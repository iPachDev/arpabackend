# Crear ubicación

`POST /api/v1/locations`

Registra una ubicación activa en MongoDB. Requiere cookie de sesión y cualquiera de los roles `owner`, `editor` o `reader`; el usuario autenticado queda como propietario del recurso.

BIAN: `Location Data Management` / `Register`. Schemas Swagger: `CreateLocationDto` y `LocationResponseDto`.
