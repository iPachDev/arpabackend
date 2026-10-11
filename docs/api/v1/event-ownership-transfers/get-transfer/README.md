# Consultar transferencia de propiedad

`GET /api/v1/event-ownership-transfers/{token}`

Ruta pública que valida el token opaco y devuelve solamente el contexto necesario para mostrar la invitación. No expone el hash almacenado ni información privada del propietario anterior.

BIAN: `Promotional Events` / `Retrieve`. Schema Swagger: `EventOwnershipTransferPreviewDto`.
