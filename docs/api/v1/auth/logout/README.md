# Cerrar sesión actual

## Endpoint

```http
POST /api/v1/auth/logout
Cookie: arpa_session=...
```

Es una operación idempotente protegida por la validación de origen: si existe una cookie, revoca la sesión en MongoDB; después elimina la cookie y responde `204 No Content`. También funciona cuando la sesión ya expiró o fue revocada.

Una cookie eliminada sin revocar el registro no sería suficiente: la revocación en servidor garantiza que una copia previa del token tampoco pueda reutilizarse.
