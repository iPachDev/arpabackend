# Consultar mi perfil

## Endpoint

```http
GET /api/v1/profile
Cookie: arpa_session=<token>
```

Devuelve el perfil del usuario autenticado. Requiere una sesión activa y acepta los roles `owner`, `editor` y `reader`.

```json
{
  "id": "66f84cbd29d229e491a23362",
  "name": "Fernando Pacheco",
  "email": "fernando@example.com",
  "phone": "+525512345678",
  "alias": "fer.racing",
  "bio": "Aficionado al automovilismo.",
  "city": "Ciudad de México",
  "country": "México",
  "racingNumber": 27,
  "favoriteCategories": ["karting", "gt"],
  "favoriteDriver": "Ayrton Senna",
  "favoriteTrack": "Autódromo Hermanos Rodríguez",
  "avatarUrl": null,
  "coverUrl": null
}
```

El correo es informativo y no se puede editar desde el perfil. La contraseña, el rol y los datos internos de la sesión nunca se incluyen.

En Swagger, la ruta muestra el requisito de cookie y el esquema `ProfileResponseDto`. Dentro del estándar BIAN, esta operación se agrupa en `Party Reference Data Directory` porque consulta información de referencia de una persona.

