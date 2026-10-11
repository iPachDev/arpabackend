# Actualizar evento

`PATCH /api/v1/events/{slug}`

Actualiza parcialmente un evento sin cambiar su `slug`. Solo el usuario que lo creó puede modificarlo. Permite reemplazar su agenda de fechas, valida cada rango horario, el cierre de inscripciones y que el cupo no sea inferior a las inscripciones existentes.

BIAN: `Promotional Events` / `Update`. Schemas Swagger: `UpdateEventDto`, `EventSessionDto` y `EventResponseDto`.
