# Marcar notificación como leída

`PATCH /api/v1/notifications/{id}/read`

Registra la primera fecha de lectura de una notificación propia. No permite consultar ni modificar notificaciones de otro usuario.

BIAN: `Customer Event History` / `Update`. Requiere sesión; roles `owner`, `editor` y `reader`. Schema Swagger: `NotificationResponseDto`.
