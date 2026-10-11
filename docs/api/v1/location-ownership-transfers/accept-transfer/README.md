# Aceptar transferencia de ubicación

`POST /api/v1/location-ownership-transfers/{token}/accept`

Requiere sesión. El usuario y correo de la sesión deben coincidir con el destinatario; el cambio de propietario es condicional y de un solo uso.

BIAN: `Location Data Management` / `Update`. Schema Swagger: `AcceptLocationOwnershipTransferResponseDto`.
