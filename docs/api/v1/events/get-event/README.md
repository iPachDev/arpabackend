# Consultar evento

`GET /api/v1/events/{slug}`

Recupera la agenda completa con el nombre de cada fecha y sus horarios y ubicación, además del tipo, disciplina, descripción, cupo y estado de inscripción. `canEdit` solo es verdadero para quien creó el evento.

BIAN: `Promotional Events` / `Retrieve`. Schema Swagger: `EventResponseDto`.
