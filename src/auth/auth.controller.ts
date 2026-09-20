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

    const safeToken = token;
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
    input:focus{box-shadow:0 0 0 2px #E53935}
    button{width:100%;padding:16px;background:#E53935;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:bold;cursor:pointer}
    .msg{margin-top:16px;padding:14px;border-radius:10px;font-size:14px;display:none}
    .ok{background:#1b5e20;color:#a5d6a7}
    .err{background:#4e0000;color:#ef9a9a}
  </style>
</head>
<body>
  <div class="card" id="card">
    <h1>Nueva contrasena</h1>
    <p>Introduce tu nueva contrasena para recuperar el acceso.</p>
    <label>Nueva contrasena</label>
    <input type="password" id="pass" placeholder="Minimo 6 caracteres">
    <label>Confirmar contrasena</label>
    <input type="password" id="confirm" placeholder="Repite la contrasena">
    <button id="btn">Guardar contrasena</button>
    <div class="msg err" id="err"></div>
  </div>
  <script>
    var TOKEN = '${safeToken}';
    document.getElementById('btn').onclick = function() {
      var pass = document.getElementById('pass').value;
      var conf = document.getElementById('confirm').value;
      var err  = document.getElementById('err');
      var btn  = document.getElementById('btn');
      err.style.display = 'none';
      if (pass.length < 6) { err.textContent = 'Minimo 6 caracteres'; err.style.display = 'block'; return; }
      if (pass !== conf)   { err.textContent = 'Las contrasenas no coinciden'; err.style.display = 'block'; return; }
      btn.textContent = 'Guardando...';
      btn.disabled = true;
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/auth/reset-password');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function() {
        var data = JSON.parse(xhr.responseText);
        if (xhr.status === 200 || xhr.status === 201) {
          document.getElementById('card').innerHTML = '<p style="color:#a5d6a7;font-size:16px">Contrasena actualizada. Ya puedes iniciar sesion en la app.</p>';
        } else {
          err.textContent = data.message || 'Error al actualizar';
          err.style.display = 'block';
          btn.textContent = 'Guardar contrasena';
          btn.disabled = false;
        }
      };
      xhr.onerror = function() {
        err.textContent = 'Error de conexion';
        err.style.display = 'block';
        btn.textContent = 'Guardar contrasena';
        btn.disabled = false;
      };
      xhr.send(JSON.stringify({ token: TOKEN, password: pass }));
    };
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}