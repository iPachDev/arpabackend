# Mis notificaciones

`GET /api/v1/notifications/mine`

Devuelve hasta las 100 notificaciones más recientes del usuario autenticado, incluyendo su estado de correo (`pending`, `sent` o `failed`) y lectura.

BIAN: `Customer Event History` / `Retrieve`. Requiere sesión; roles `owner`, `editor` y `reader`. Schema Swagger: `NotificationResponseDto`.
