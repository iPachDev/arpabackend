# Aceptar transferencia de propiedad

`POST /api/v1/event-ownership-transfers/{token}/accept`

Requiere sesión. El identificador y correo del usuario autenticado deben coincidir con el destinatario registrado en la invitación. La actualización comprueba además que el evento siga activo y conserve al propietario original.

Al aceptar, el destinatario se convierte en propietario del recurso; esto no modifica el rol global de su cuenta.

BIAN: `Promotional Events` / `Update`. Schema Swagger: `AcceptEventOwnershipTransferResponseDto`.
