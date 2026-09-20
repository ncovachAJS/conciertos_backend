import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Límite estricto en registro: 5 intentos por minuto para prevenir bots
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Límite estricto en login: 5 intentos por minuto para prevenir fuerza bruta
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.authService.me(req.user.id);
  }

  // ── Password reset ──────────────────────────────────────────────────────

  // Límite estricto en recuperación: 5 intentos por minuto para evitar enumeración de emails
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('forgot-password')
  forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.authService.resetPassword(token, password);
  }

  /** Endpoint para el formulario HTML — recibe form data y devuelve HTML */
  @Post('reset-password-form')
  async resetPasswordForm(
    @Body('token') token: string,
    @Body('password') password: string,
    @Body('confirm') confirm: string,
    @Res() res: Response,
  ) {
    const style = `<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#121212;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.card{background:#1e1e1e;border-radius:20px;padding:36px;width:100%;max-width:400px}p{font-size:16px;line-height:1.5}</style>`;

    if (!password || password.length < 6) {
      return res.status(400).send(`<!DOCTYPE html><html><head><meta charset="UTF-8">${style}</head><body><div class="card"><p style="color:#ef9a9a">La contrasena debe tener al menos 6 caracteres.</p><br><a href="javascript:history.back()" style="color:#E53935">Volver</a></div></body></html>`);
    }
    if (password !== confirm) {
      return res.status(400).send(`<!DOCTYPE html><html><head><meta charset="UTF-8">${style}</head><body><div class="card"><p style="color:#ef9a9a">Las contrasenas no coinciden.</p><br><a href="javascript:history.back()" style="color:#E53935">Volver</a></div></body></html>`);
    }

    try {
      await this.authService.resetPassword(token, password);
      return res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8">${style}</head><body><div class="card"><p style="color:#a5d6a7">Contrasena actualizada correctamente. Ya puedes iniciar sesion en la app.</p></div></body></html>`);
    } catch (e: any) {
      return res.status(400).send(`<!DOCTYPE html><html><head><meta charset="UTF-8">${style}</head><body><div class="card"><p style="color:#ef9a9a">${e.message ?? 'Error al actualizar la contrasena.'}</p><br><a href="javascript:history.back()" style="color:#E53935">Volver</a></div></body></html>`);
    }
  }

  /** Página web servida desde el backend para introducir la nueva contraseña */
  @Get('reset-password-page')
  resetPage(@Query('token') token: string, @Res() res: Response) {
    // Validar que el token solo contiene caracteres hexadecimales (64 chars).
    // Cualquier otro valor es inválido y rechazamos antes de embeber en HTML,
    // evitando XSS reflejado en el bloque <script>.
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      res.status(400).send('Enlace inválido o expirado. Solicita uno nuevo desde la app.');
      return;
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Nueva contrasena</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#121212;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
    .card{background:#1e1e1e;border-radius:20px;padding:36px;width:100%;max-width:400px}
    h1{font-size:22px;margin-bottom:8px}
    p{color:#aaa;font-size:14px;margin-bottom:28px}
    label{display:block;font-size:13px;color:#aaa;margin-bottom:6px}
    input{width:100%;padding:14px;background:#2a2a2a;border:none;border-radius:12px;color:#fff;font-size:16px;margin-bottom:16px;outline:none}
    button{width:100%;padding:16px;background:#E53935;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:bold;cursor:pointer}
  </style>
</head>
<body>
  <div class="card">
    <h1>Nueva contrasena</h1>
    <p>Introduce tu nueva contrasena para recuperar el acceso.</p>
    <form method="POST" action="/auth/reset-password-form">
      <input type="hidden" name="token" value="${token}">
      <label>Nueva contrasena</label>
      <input type="password" name="password" placeholder="Minimo 6 caracteres" required minlength="6">
      <label>Confirmar contrasena</label>
      <input type="password" name="confirm" placeholder="Repite la contrasena" required>
      <button type="submit">Guardar contrasena</button>
    </form>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}