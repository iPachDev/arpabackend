# Crear usuario

Registra un usuario y crea su perfil inicial de acceso a ARPA.

## Correspondencia BIAN

- **Service Domain:** Customer Access Entitlement.
- **Acción semántica:** Establish/Initiate Customer Access Profile.
- **Implementación ARPA:** recurso REST `users`, manteniendo un contrato pequeño para no trasladar toda la complejidad del modelo BIAN al primer registro.

## Endpoint

```http
POST /api/v1/users
Content-Type: application/json
```

### Solicitud

```json
{
  "name": "Fernando Pacheco",
  "email": "fernando@example.com",
  "phone": "+525512345678",
  "password": "MiPassword123"
}
```

El teléfono debe usar el formato internacional E.164. Se aceptan espacios, paréntesis y guiones; la API los elimina antes de validar.

En el formulario web, el usuario selecciona su país y escribe únicamente su número nacional. El frontend valida el número y agrega automáticamente el prefijo internacional antes de enviarlo.

### Respuesta `201 Created`

```json
{
  "id": "66f84cbd29d229e491a23362",
  "name": "Fernando Pacheco",
  "email": "fernando@example.com",
  "phone": "+525512345678",
  "status": "active",
  "role": "reader",
  "createdAt": "2026-09-27T12:00:00.000Z"
}
```

La contraseña se almacena únicamente como hash bcrypt. Ni la contraseña ni el hash forman parte de la respuesta.

El registro público siempre asigna el rol `reader`. Los roles elevados nunca se aceptan desde este endpoint.

## Errores

| Estado | Motivo |
| --- | --- |
| `400 Bad Request` | Campos faltantes, desconocidos o con formato inválido. |
| `409 Conflict` | El correo o teléfono ya está registrado. |
| `500 Internal Server Error` | Error inesperado sin exposición de detalles internos. |

## Documentación interactiva

Con el backend en ejecución y `SWAGGER_ENABLED=true`:

- Swagger UI: `http://localhost:3001/api/docs`
- OpenAPI JSON: `http://localhost:3001/api/docs-json`

Los schemas de solicitud, respuesta y error se generan desde los DTO de NestJS para mantener el contrato sincronizado con la implementación.
