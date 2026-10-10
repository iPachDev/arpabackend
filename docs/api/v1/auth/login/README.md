# Iniciar sesión

## Endpoint

```http
POST /api/v1/auth/login
Content-Type: application/json
```

Ruta pública limitada a cinco intentos por minuto y dirección de origen.

```json
{
  "email": "fernando@example.com",
  "password": "MiPassword123"
}
```

Si las credenciales son válidas, responde `200` con el usuario y envía la cookie configurada en `SESSION_COOKIE_NAME`.

```json
{
  "user": {
    "id": "66f84cbd29d229e491a23362",
    "name": "Fernando Pacheco",
    "email": "fernando@example.com",
    "role": "reader"
  },
  "expiresAt": "2026-10-04T12:00:00.000Z"
}
```

La cookie es `HttpOnly`, `SameSite=Strict`, `Secure` en producción y nunca se expone en el cuerpo. El navegador recibe un token aleatorio de 256 bits; MongoDB conserva únicamente su hash SHA-256.

Los errores de usuario inexistente, contraseña incorrecta o usuario deshabilitado producen el mismo `401` para evitar enumeración de cuentas.
