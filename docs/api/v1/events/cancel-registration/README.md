# Cancelar inscripción

`DELETE /api/v1/events/{slug}/registrations/me`

Realiza una baja lógica de la inscripción y conserva su historial. Persiste una notificación y envía por Resend el correo de cancelación. Un fallo del correo no revierte la baja. Responde `204 No Content`.

BIAN: `Promotional Events` / `Control`. Requiere sesión y solo afecta al usuario autenticado.
