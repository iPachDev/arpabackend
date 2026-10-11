# Solicitar transferencia de propiedad

`POST /api/v1/locations/{slug}/ownership-transfers`

Solo el propietario actual puede invitar a otro usuario activo. Guarda únicamente el hash SHA-256 del token y envía el enlace de un solo uso mediante Resend; la propiedad no cambia hasta la aceptación.

BIAN: `Location Data Management` / `Request`. Schemas Swagger: `CreateLocationOwnershipTransferDto` y `LocationOwnershipTransferResponseDto`.
