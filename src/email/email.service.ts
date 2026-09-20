import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey = process.env.BREVO_API_KEY!;
  private readonly senderEmail = process.env.BREVO_SENDER_EMAIL!;
  private readonly senderName = process.env.BREVO_SENDER_NAME ?? 'La Vida en Directo';
  private readonly appName = 'La Vida en Directo';

  private async send(to: string, subject: string, html: string): Promise<void> {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: this.senderName, email: this.senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Brevo error: ${error}`);
      throw new Error('No se pudo enviar el email');
    }
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const backendUrl =
      process.env.BACKEND_URL ?? 'https://conciertos-backend.onrender.com';
    const resetUrl = `${backendUrl}/auth/reset-password-page?token=${token}`;

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#E53935">🎸 ${this.appName}</h2>
        <p>Hola,</p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p>Pulsa el botón para crear una nueva contraseña. El enlace expira en <strong>1 hora</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;margin:24px 0;padding:14px 28px;
                  background:#E53935;color:#fff;text-decoration:none;
                  border-radius:10px;font-weight:bold">
          Restablecer contraseña
        </a>
        <p style="color:#888;font-size:13px">
          Si no solicitaste este cambio, ignora este email.
        </p>
      </div>
    `;

    await this.send(email, 'Restablece tu contraseña', html);
    this.logger.log(`Email de recuperación enviado a ${email}`);
  }

  async sendWelcome(email: string, name: string): Promise<void> {
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#E53935">🎸 ${this.appName}</h2>
        <p>Hola ${name},</p>
        <p>¡Bienvenido/a a <strong>${this.appName}</strong>! Ya puedes empezar a registrar tus conciertos y revivir cada momento.</p>
        <p style="color:#888;font-size:13px">
          Si no creaste esta cuenta, ignora este email.
        </p>
      </div>
    `;

    await this.send(email, `¡Bienvenido/a a ${this.appName}!`, html);
    this.logger.log(`Email de bienvenida enviado a ${email}`);
  }
}
