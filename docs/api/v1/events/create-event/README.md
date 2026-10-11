# Crear evento

`POST /api/v1/events`

Crea un evento y asigna al usuario autenticado como propietario. `sessions` admite de 1 a 50 fechas, cada una con nombre, inicio, fin y ubicación opcional e independiente. El frontend propone nombres como `Fecha #1`, que pueden personalizarse. El cupo, cierre de inscripciones e imagen son opcionales. Requiere sesión y admite `owner`, `editor` y `reader`; la autorización de edición posterior se valida por propiedad del evento.

BIAN: `Promotional Events` / `Register`. Schemas Swagger: `CreateEventDto`, `EventSessionDto`, `EventLocationDto` y `EventResponseDto`.
