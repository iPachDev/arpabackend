type Environment = Record<string, string | undefined>;

const requiredVariables = ['MONGODB_URI'] as const;

export function validateEnvironment(environment: Environment): Environment {
  const missingVariables = requiredVariables.filter(
    (variable) => !environment[variable]?.trim(),
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${missingVariables.join(', ')}`,
    );
  }

  const port = Number(environment.PORT ?? 3001);
  const saltRounds = Number(environment.BCRYPT_SALT_ROUNDS ?? 12);
  const sessionTtlDays = Number(environment.SESSION_TTL_DAYS ?? 7);
  const invitationTtlDays = Number(environment.TEAM_INVITATION_TTL_DAYS ?? 7);
  const teamTransferTtlDays = Number(
    environment.TEAM_OWNERSHIP_TRANSFER_TTL_DAYS ?? 7,
  );
  const eventTransferTtlDays = Number(
    environment.EVENT_OWNERSHIP_TRANSFER_TTL_DAYS ?? 7,
  );
  const locationTransferTtlDays = Number(
    environment.LOCATION_OWNERSHIP_TRANSFER_TTL_DAYS ?? 7,
  );
  const emailVerificationTtlMinutes = Number(
    environment.EMAIL_VERIFICATION_TTL_MINUTES ?? 10,
  );

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT debe ser un puerto válido.');
  }

  if (!Number.isInteger(saltRounds) || saltRounds < 10 || saltRounds > 15) {
    throw new Error('BCRYPT_SALT_ROUNDS debe ser un entero entre 10 y 15.');
  }

  if (
    !Number.isInteger(sessionTtlDays) ||
    sessionTtlDays < 1 ||
    sessionTtlDays > 30
  ) {
    throw new Error('SESSION_TTL_DAYS debe ser un entero entre 1 y 30.');
  }

  if (
    !Number.isInteger(invitationTtlDays) ||
    invitationTtlDays < 1 ||
    invitationTtlDays > 30
  ) {
    throw new Error(
      'TEAM_INVITATION_TTL_DAYS debe ser un entero entre 1 y 30.',
    );
  }

  if (
    !Number.isInteger(eventTransferTtlDays) ||
    eventTransferTtlDays < 1 ||
    eventTransferTtlDays > 30
  ) {
    throw new Error(
      'EVENT_OWNERSHIP_TRANSFER_TTL_DAYS debe ser un entero entre 1 y 30.',
    );
  }

  if (
    !Number.isInteger(teamTransferTtlDays) ||
    teamTransferTtlDays < 1 ||
    teamTransferTtlDays > 30
  ) {
    throw new Error(
      'TEAM_OWNERSHIP_TRANSFER_TTL_DAYS debe ser un entero entre 1 y 30.',
    );
  }

  if (
    !Number.isInteger(locationTransferTtlDays) ||
    locationTransferTtlDays < 1 ||
    locationTransferTtlDays > 30
  ) {
    throw new Error(
      'LOCATION_OWNERSHIP_TRANSFER_TTL_DAYS debe ser un entero entre 1 y 30.',
    );
  }

  if (
    !Number.isInteger(emailVerificationTtlMinutes) ||
    emailVerificationTtlMinutes < 5 ||
    emailVerificationTtlMinutes > 60
  ) {
    throw new Error(
      'EMAIL_VERIFICATION_TTL_MINUTES debe ser un entero entre 5 y 60.',
    );
  }

  return {
    ...environment,
    PORT: String(port),
    API_PREFIX: environment.API_PREFIX?.trim() || 'api',
    CORS_ORIGIN: environment.CORS_ORIGIN?.trim() || 'http://localhost:3000',
    SWAGGER_ENABLED: environment.SWAGGER_ENABLED?.trim() || 'true',
    BCRYPT_SALT_ROUNDS: String(saltRounds),
    SESSION_COOKIE_NAME:
      environment.SESSION_COOKIE_NAME?.trim() || 'arpa_session',
    SESSION_TTL_DAYS: String(sessionTtlDays),
    FRONTEND_URL: environment.FRONTEND_URL?.trim() || 'http://localhost:3000',
    TEAM_INVITATION_TTL_DAYS: String(invitationTtlDays),
    TEAM_OWNERSHIP_TRANSFER_TTL_DAYS: String(teamTransferTtlDays),
    EVENT_OWNERSHIP_TRANSFER_TTL_DAYS: String(eventTransferTtlDays),
    LOCATION_OWNERSHIP_TRANSFER_TTL_DAYS: String(locationTransferTtlDays),
    EMAIL_VERIFICATION_TTL_MINUTES: String(emailVerificationTtlMinutes),
    RESEND_API_KEY: environment.RESEND_API_KEY?.trim() || '',
    RESEND_FROM: environment.RESEND_FROM?.trim() || '',
    RESEND_CONTACT_TO: environment.RESEND_CONTACT_TO?.trim() || '',
  };
}
