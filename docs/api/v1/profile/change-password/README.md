# Cambiar mi contraseña

## Endpoint

```http
PATCH /api/v1/profile/password
Content-Type: application/json
Cookie: arpa_session=<token>
```

Requiere una sesión activa y acepta los roles `owner`, `editor` y `reader`. Está limitado a cinco intentos por minuto.

```json
{
  "currentPassword": "MiPasswordActual123",
  "newPassword": "UnaNuevaClaveSegura123",
  "confirmPassword": "UnaNuevaClaveSegura123"
}
```

La nueva contraseña debe tener entre 12 y 72 caracteres, coincidir con la confirmación y ser diferente a la actual. Se almacena únicamente su hash bcrypt; nunca se devuelve ni se registra en logs.

Después del cambio se conserva la sesión actual y se revocan las demás sesiones del usuario. La respuesta correcta es `204 No Content`.

Swagger documenta el esquema `ChangePasswordDto`, la autenticación por cookie y los roles permitidos. La operación pertenece al dominio BIAN `Party Reference Data Directory`.

