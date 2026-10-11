# Dar de baja un evento

`DELETE /api/v1/events/{slug}`

Realiza una baja lógica y conserva el evento, sus fechas y sus inscripciones en MongoDB. El evento deja de aparecer en eventos, exploración e inscripciones activas. También cancela cualquier transferencia pendiente.

Solo el propietario actual puede realizarla y `confirmationTitle` debe coincidir exactamente con el nombre del evento.

BIAN: `Promotional Events` / `Control`. Schema Swagger: `ArchiveEventDto`.
