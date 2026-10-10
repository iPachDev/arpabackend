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

@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) {}

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
