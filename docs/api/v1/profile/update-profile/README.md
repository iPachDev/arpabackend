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
  "favoriteCategories": ["karting", "gt"],
  "favoriteDriver": "Ayrton Senna",
  "favoriteTrack": "Autódromo Hermanos Rodríguez"
}
```

No acepta `email`, `role`, `passwordHash`, `avatarUrl` ni `coverUrl`. Los selectores de foto de esta primera versión son vistas previas locales: abren el explorador de archivos, pero todavía no suben ni persisten imágenes.

El teléfono se normaliza al formato internacional E.164. Las categorías admitidas son `karting`, `formula`, `gt`, `rally`, `off-road` y `sim-racing`.

En Swagger, `UpdateProfileDto` documenta cada campo y la ruta indica autenticación por cookie y acceso RBAC. La operación está agrupada en el dominio BIAN `Party Reference Data Directory`.

