# Inscribirse a un evento

`POST /api/v1/events/{slug}/registrations`

Crea o reactiva la inscripción del usuario autenticado. Evita duplicados y valida inicio, fecha límite y cupo máximo. Además persiste una notificación en MongoDB y envía por Resend un correo con todas las fechas y ubicaciones. Si el correo falla, la inscripción se conserva y el fallo queda registrado.

BIAN: `Promotional Events` / `Register`. Schema Swagger: `EventRegistrationResponseDto`.
