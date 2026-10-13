# Actualizar mi perfil

## Endpoint

```http
PATCH /api/v1/profile
Content-Type: application/json
Cookie: arpa_session=<token>
```

Actualiza únicamente los campos enviados. Requiere una sesión activa y acepta los roles `owner`, `editor` y `reader`.

```json
{
  "name": "Fernando Pacheco",
  "alias": "fer.racing",
  "phone": "+525512345678",
  "bio": "Aficionado al automovilismo.",
  "city": "Ciudad de México",
  "country": "México",
  "racingNumber": 27,
  "favoriteCategories": ["karting", "gt"]
}
```

No acepta `email`, `role`, `passwordHash`, `avatarUrl` ni `coverUrl`. La foto y la portada se cambian exclusivamente mediante `POST /api/v1/profile/avatar` y `POST /api/v1/profile/cover`.

El teléfono se normaliza al formato internacional E.164. Las categorías admitidas son `karting`, `formula`, `gt`, `rally`, `off-road` y `sim-racing`.

En Swagger, `UpdateProfileDto` documenta cada campo y la ruta indica autenticación por cookie y acceso RBAC. La operación está agrupada en el dominio BIAN `Party Reference Data Directory`.
