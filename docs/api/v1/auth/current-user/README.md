# Consultar usuario autenticado

## Endpoint

```http
GET /api/v1/auth/me
Cookie: arpa_session=...
```

Requiere una sesión activa. Roles permitidos: `owner`, `editor` y `reader`.

```json
{
  "id": "66f84cbd29d229e491a23362",
  "name": "Fernando Pacheco",
  "email": "fernando@example.com",
  "role": "reader"
}
```

- `401 Unauthorized`: cookie ausente, sesión expirada, revocada o usuario deshabilitado.
- `403 Forbidden`: usuario autenticado sin uno de los roles permitidos.
