import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey = process.env.RESEND_API_KEY!;
  private readonly from = 'onboarding@resend.dev';
  private readonly appName = 'La Vida en Directo';

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

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${this.appName} <${this.from}>`,
        to: [email],
        subject: 'Restablece tu contraseña',
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Resend error: ${error}`);
      throw new Error('No se pudo enviar el email');
    }

    this.logger.log(`Email de recuperación enviado a ${email}`);
  }
}