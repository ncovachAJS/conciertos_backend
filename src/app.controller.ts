import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('delete-account')
  @Header('Content-Type', 'text/html; charset=utf-8')
  deleteAccount(): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eliminar cuenta — La Vida en Directo</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 60px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.6; }
    h1 { font-size: 1.8rem; margin-bottom: 8px; }
    h2 { font-size: 1.1rem; margin-top: 32px; color: #333; }
    p { color: #444; }
    ol { color: #444; padding-left: 20px; }
    li { margin-bottom: 8px; }
    .note { background: #f5f5f5; border-left: 4px solid #e53935; padding: 12px 16px; border-radius: 4px; margin-top: 32px; font-size: 0.9rem; color: #555; }
    a { color: #e53935; }
  </style>
</head>
<body>
  <h1>Eliminar cuenta</h1>
  <p><strong>La Vida en Directo</strong> — Instrucciones para eliminar tu cuenta y datos</p>

  <h2>Desde la app (recomendado)</h2>
  <ol>
    <li>Abre la app <strong>La Vida en Directo</strong></li>
    <li>Ve a tu <strong>Perfil</strong> (icono de persona, abajo a la derecha)</li>
    <li>Desplázate hasta el final y pulsa <strong>«Eliminar cuenta»</strong></li>
    <li>Confirma la acción en el diálogo que aparece</li>
  </ol>
  <p>Tu cuenta y todos tus datos (conciertos, fotos, amigos) se eliminarán de forma permanente e inmediata.</p>

  <h2>Por email</h2>
  <p>Si no puedes acceder a la app, envía un correo a <a href="mailto:ncovach@gmail.com">ncovach@gmail.com</a> con el asunto <strong>«Eliminar cuenta»</strong> indicando el email asociado a tu cuenta. Procesaremos la solicitud en un plazo máximo de 7 días.</p>

  <div class="note">
    <strong>Datos que se eliminan:</strong> nombre, email, foto de perfil, conciertos guardados, fotos subidas y conexión con Spotify.<br><br>
    <strong>Datos que se conservan:</strong> ninguno. La eliminación es completa e irreversible.
  </div>
</body>
</html>`;
  }
}
