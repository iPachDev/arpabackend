# Solicitar transferencia de propiedad

`POST /api/v1/events/{slug}/ownership-transfers`

Crea una invitación de un solo uso para transferir la propiedad del evento. Solo el propietario actual puede solicitarla y el correo debe pertenecer a un usuario activo de ARPA. La propiedad no cambia hasta que el destinatario acepta.

La invitación se persiste en `event_ownership_transfers`, almacena únicamente el hash del token y se envía mediante Resend.

BIAN: `Promotional Events` / `Request`. Schemas Swagger: `CreateEventOwnershipTransferDto` y `EventOwnershipTransferResponseDto`.
