# Dar de baja mi cuenta

## Endpoint

```http
DELETE /api/v1/profile
Content-Type: application/json
Cookie: arpa_session=<token>
```

```json
{
  "confirmation": "eliminar cuenta"
}
```

Requiere una sesión activa y que `confirmation` coincida exactamente con `eliminar cuenta`. La operación realiza una baja lógica: cambia el estado del usuario a `disabled`, registra la fecha de baja y revoca todas sus sesiones. También elimina la cookie de sesión del navegador.

La información del usuario y sus recursos se conservan para auditoría; no se ejecuta un borrado físico. Una cuenta desactivada no puede autenticarse y sus cookies anteriores dejan de ser válidas.

La respuesta correcta es `204 No Content`. Una frase incorrecta devuelve `400 Bad Request` y una petición sin sesión devuelve `401 Unauthorized`.

Swagger documenta `DeactivateAccountDto`, la autenticación por cookie y los roles admitidos. En BIAN corresponde a `Party Reference Data Directory` con el action term `Control`.
