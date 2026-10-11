# Aceptar transferencia de propiedad de un equipo

`POST /api/v1/team-ownership-transfers/{token}/accept`

Requiere una sesión cuyo usuario y correo coincidan con el destinatario. La actualización comprueba de forma condicional que el equipo siga activo y conserve al propietario original.

Al aceptar, el destinatario se convierte en owner, se elimina cualquier membresía duplicada que tuviera en el equipo y el propietario anterior pierde el acceso.
