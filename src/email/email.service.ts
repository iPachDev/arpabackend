import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

type TeamInvitationEmail = {
  to: string;
  invitedName: string;
  teamName: string;
  inviterName: string;
  invitationUrl: string;
  expiresAt: Date;
};

type TeamOwnershipTransferEmail = {
  to: string;
  newOwnerName: string;
  currentOwnerName: string;
  teamName: string;
  transferUrl: string;
  expiresAt: Date;
};

type EventRegistrationEmail = {
  to: string;
  userName: string;
  eventName: string;
  action: 'registered' | 'cancelled';
  eventUrl: string;
  sessions: Array<{
    name: string;
    startsAt: Date;
    endsAt: Date;
    locationName: string | null;
  }>;
};

type EventOwnershipTransferEmail = {
  to: string;
  newOwnerName: string;
  currentOwnerName: string;
  eventName: string;
  transferUrl: string;
  expiresAt: Date;
};

type LocationOwnershipTransferEmail = {
  to: string;
  newOwnerName: string;
  currentOwnerName: string;
  locationName: string;
  transferUrl: string;
  expiresAt: Date;
};

type AccountVerificationEmail = {
  to: string;
  userName: string;
  code: string;
  expiresInMinutes: number;
};

@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) {}

  async sendAccountVerification(
    input: AccountVerificationEmail,
  ): Promise<string> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    const from = this.configService.get<string>('RESEND_FROM')?.trim();
    const replyTo = this.configService.get<string>('RESEND_CONTACT_TO')?.trim();

    if (!apiKey || !from) {
      throw new ServiceUnavailableException(
        'El envío de verificaciones no está configurado.',
      );
    }

    const userName = this.escapeHtml(input.userName);
    const code = this.escapeHtml(input.code);
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      ...(replyTo ? { replyTo } : {}),
      subject: `${input.code} · Confirma tu cuenta en ARPA`,
      text: `Hola ${input.userName}. Tu código para confirmar tu cuenta en ARPA es ${input.code}. Vence en ${input.expiresInMinutes} minutos.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#171717;line-height:1.6">
          <h1 style="font-size:24px;margin-bottom:8px">Confirma tu cuenta</h1>
          <p>Hola ${userName}, usa este código para validar tu correo electrónico en ARPA:</p>
          <div style="margin:28px 0;padding:22px;border-radius:12px;background:#f5f5f5;text-align:center;font-size:42px;line-height:1;font-weight:700;letter-spacing:10px;color:#171717">
            ${code}
          </div>
          <p style="font-size:13px;color:#666">El código vence en ${input.expiresInMinutes} minutos. Si no creaste esta cuenta, puedes ignorar este correo.</p>
        </div>
      `,
    });

    if (error || !data?.id) {
      throw new BadGatewayException(
        'No pudimos enviar el correo de verificación.',
      );
    }

    return data.id;
  }

  async sendTeamInvitation(input: TeamInvitationEmail): Promise<string> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    const from = this.configService.get<string>('RESEND_FROM')?.trim();
    const replyTo = this.configService.get<string>('RESEND_CONTACT_TO')?.trim();

    if (!apiKey || !from) {
      throw new ServiceUnavailableException(
        'El envío de invitaciones no está configurado.',
      );
    }

    const resend = new Resend(apiKey);
    const invitedName = this.escapeHtml(input.invitedName);
    const teamName = this.escapeHtml(input.teamName);
    const inviterName = this.escapeHtml(input.inviterName);
    const invitationUrl = this.escapeHtml(input.invitationUrl);
    const expires = new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'long',
    }).format(input.expiresAt);

    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      ...(replyTo ? { replyTo } : {}),
      subject: `${input.inviterName} te invitó a ${input.teamName}`,
      text: `${input.inviterName} te invitó a formar parte de ${input.teamName}. Acepta antes del ${expires}: ${input.invitationUrl}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#171717;line-height:1.6">
          <h1 style="font-size:24px">Hola ${invitedName}</h1>
          <p><strong>${inviterName}</strong> te invitó a formar parte de <strong>${teamName}</strong>.</p>
          <p>
            <a href="${invitationUrl}" style="display:inline-block;background:#ff3630;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">
              Revisar invitación
            </a>
          </p>
          <p style="font-size:13px;color:#666">El enlace vence el ${expires}. Si no esperabas esta invitación, puedes ignorar este correo.</p>
        </div>
      `,
    });

    if (error || !data?.id) {
      throw new BadGatewayException(
        'No pudimos enviar el correo de invitación.',
      );
    }

    return data.id;
  }

  async sendTeamOwnershipTransfer(
    input: TeamOwnershipTransferEmail,
  ): Promise<string> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    const from = this.configService.get<string>('RESEND_FROM')?.trim();
    const replyTo = this.configService.get<string>('RESEND_CONTACT_TO')?.trim();

    if (!apiKey || !from) {
      throw new ServiceUnavailableException(
        'El envío de transferencias no está configurado.',
      );
    }

    const newOwnerName = this.escapeHtml(input.newOwnerName);
    const currentOwnerName = this.escapeHtml(input.currentOwnerName);
    const teamName = this.escapeHtml(input.teamName);
    const transferUrl = this.escapeHtml(input.transferUrl);
    const expires = new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'long',
    }).format(input.expiresAt);
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      ...(replyTo ? { replyTo } : {}),
      subject: `Te transfirieron la propiedad de ${input.teamName}`,
      text: `${input.currentOwnerName} quiere transferirte la propiedad de ${input.teamName}. Acepta antes del ${expires}: ${input.transferUrl}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#171717;line-height:1.6">
          <h1 style="font-size:24px">Hola ${newOwnerName}</h1>
          <p><strong>${currentOwnerName}</strong> quiere transferirte la propiedad del equipo <strong>${teamName}</strong>.</p>
          <p>La propiedad cambiará únicamente cuando aceptes. El propietario anterior perderá el acceso al equipo.</p>
          <p><a href="${transferUrl}" style="display:inline-block;background:#ff3630;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">Revisar transferencia</a></p>
          <p style="font-size:13px;color:#666">El enlace vence el ${expires}. Si no esperabas esta invitación, puedes ignorarla.</p>
        </div>
      `,
    });

    if (error || !data?.id) {
      throw new BadGatewayException(
        'No pudimos enviar el correo de transferencia.',
      );
    }

    return data.id;
  }

  async sendEventRegistrationNotification(
    input: EventRegistrationEmail,
  ): Promise<string> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    const from = this.configService.get<string>('RESEND_FROM')?.trim();
    const replyTo = this.configService.get<string>('RESEND_CONTACT_TO')?.trim();

    if (!apiKey || !from) {
      throw new ServiceUnavailableException(
        'El envío de notificaciones no está configurado.',
      );
    }

    const confirmed = input.action === 'registered';
    const actionText = confirmed ? 'confirmada' : 'cancelada';
    const eventName = this.escapeHtml(input.eventName);
    const eventUrl = this.escapeHtml(input.eventUrl);
    const userName = this.escapeHtml(input.userName);
    const scheduleText = input.sessions
      .map((session) => this.formatSession(session))
      .join('\n');
    const scheduleHtml = input.sessions
      .map(
        (session) => `<li>${this.escapeHtml(this.formatSession(session))}</li>`,
      )
      .join('');

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      ...(replyTo ? { replyTo } : {}),
      subject: `Inscripción ${actionText}: ${input.eventName}`,
      text: `Hola ${input.userName}. Tu inscripción a ${input.eventName} fue ${actionText}.\n\n${scheduleText}\n\nConsulta el evento: ${input.eventUrl}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#171717;line-height:1.6">
          <h1 style="font-size:24px">Hola ${userName}</h1>
          <p>Tu inscripción a <strong>${eventName}</strong> fue <strong>${actionText}</strong>.</p>
          <ul style="padding-left:20px">${scheduleHtml}</ul>
          <p>
            <a href="${eventUrl}" style="display:inline-block;background:#ff3630;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">
              Ver evento
            </a>
          </p>
        </div>
      `,
    });

    if (error || !data?.id) {
      throw new BadGatewayException(
        'No pudimos enviar el correo de la inscripción.',
      );
    }

    return data.id;
  }

  async sendEventOwnershipTransfer(
    input: EventOwnershipTransferEmail,
  ): Promise<string> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    const from = this.configService.get<string>('RESEND_FROM')?.trim();
    const replyTo = this.configService.get<string>('RESEND_CONTACT_TO')?.trim();

    if (!apiKey || !from) {
      throw new ServiceUnavailableException(
        'El envío de transferencias no está configurado.',
      );
    }

    const newOwnerName = this.escapeHtml(input.newOwnerName);
    const currentOwnerName = this.escapeHtml(input.currentOwnerName);
    const eventName = this.escapeHtml(input.eventName);
    const transferUrl = this.escapeHtml(input.transferUrl);
    const expires = new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'long',
    }).format(input.expiresAt);
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      ...(replyTo ? { replyTo } : {}),
      subject: `Te invitaron a administrar ${input.eventName}`,
      text: `${input.currentOwnerName} quiere transferirte la propiedad de ${input.eventName}. Acepta antes del ${expires}: ${input.transferUrl}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#171717;line-height:1.6">
          <h1 style="font-size:24px">Hola ${newOwnerName}</h1>
          <p><strong>${currentOwnerName}</strong> quiere transferirte la propiedad del evento <strong>${eventName}</strong>.</p>
          <p>Si aceptas, podrás editar o dar de baja el evento y el propietario anterior perderá esos permisos.</p>
          <p>
            <a href="${transferUrl}" style="display:inline-block;background:#ff3630;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">
              Revisar transferencia
            </a>
          </p>
          <p style="font-size:13px;color:#666">El enlace vence el ${expires}. Si no esperabas esta invitación, puedes ignorarla.</p>
        </div>
      `,
    });

    if (error || !data?.id) {
      throw new BadGatewayException(
        'No pudimos enviar el correo de transferencia.',
      );
    }

    return data.id;
  }

  async sendLocationOwnershipTransfer(
    input: LocationOwnershipTransferEmail,
  ): Promise<string> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    const from = this.configService.get<string>('RESEND_FROM')?.trim();
    const replyTo = this.configService.get<string>('RESEND_CONTACT_TO')?.trim();
    if (!apiKey || !from) {
      throw new ServiceUnavailableException(
        'El envío de transferencias no está configurado.',
      );
    }

    const newOwnerName = this.escapeHtml(input.newOwnerName);
    const currentOwnerName = this.escapeHtml(input.currentOwnerName);
    const locationName = this.escapeHtml(input.locationName);
    const transferUrl = this.escapeHtml(input.transferUrl);
    const expires = new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'long',
    }).format(input.expiresAt);
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      ...(replyTo ? { replyTo } : {}),
      subject: `Te invitaron a administrar ${input.locationName}`,
      text: `${input.currentOwnerName} quiere transferirte la propiedad de ${input.locationName}. Acepta antes del ${expires}: ${input.transferUrl}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#171717;line-height:1.6">
          <h1 style="font-size:24px">Hola ${newOwnerName}</h1>
          <p><strong>${currentOwnerName}</strong> quiere transferirte la propiedad de <strong>${locationName}</strong>.</p>
          <p>Si aceptas, podrás editar o dar de baja la ubicación y el propietario anterior perderá esos permisos.</p>
          <p><a href="${transferUrl}" style="display:inline-block;background:#ff3630;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">Revisar transferencia</a></p>
          <p style="font-size:13px;color:#666">El enlace vence el ${expires}. Si no esperabas esta invitación, puedes ignorarla.</p>
        </div>
      `,
    });
    if (error || !data?.id) {
      throw new BadGatewayException(
        'No pudimos enviar el correo de transferencia.',
      );
    }
    return data.id;
  }

  private formatSession(session: EventRegistrationEmail['sessions'][number]) {
    const startsAt = new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(session.startsAt);
    const endsAt = new Intl.DateTimeFormat('es-MX', {
      timeStyle: 'short',
    }).format(session.endsAt);
    return `${session.name}: ${startsAt} a ${endsAt}${session.locationName ? ` · ${session.locationName}` : ''}`;
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>'"]/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#039;',
          '"': '&quot;',
        })[character] ?? character,
    );
  }
}
