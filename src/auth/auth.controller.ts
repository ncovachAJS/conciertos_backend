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

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

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
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Nueva contraseña · La Vida en Directo</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#121212;color:#fff;
         display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
    .card{background:#1e1e1e;border-radius:20px;padding:36px;width:100%;max-width:400px}
    h1{font-size:22px;margin-bottom:8px}
    p{color:#aaa;font-size:14px;margin-bottom:28px}
    label{display:block;font-size:13px;color:#aaa;margin-bottom:6px}
    input{width:100%;padding:14px;background:#2a2a2a;border:none;border-radius:12px;
          color:#fff;font-size:16px;margin-bottom:16px;outline:none}
    input:focus{box-shadow:0 0 0 2px #E53935}
    button{width:100%;padding:16px;background:#E53935;color:#fff;border:none;
           border-radius:12px;font-size:16px;font-weight:bold;cursor:pointer}
    button:hover{background:#c62828}
    .msg{margin-top:16px;padding:14px;border-radius:10px;font-size:14px;display:none}
    .ok{background:#1b5e20;color:#a5d6a7}
    .err{background:#4e0000;color:#ef9a9a}
    .logo{font-size:28px;font-weight:900;margin-bottom:24px}
    .logo span{color:#E53935}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🎸 LA VIDA <span>EN DIRECTO</span></div>
    <h1>Nueva contraseña</h1>
    <p>Introduce tu nueva contraseña para recuperar el acceso.</p>
    <form id="form">
      <label>Nueva contraseña</label>
      <input type="password" id="pass" placeholder="Mínimo 6 caracteres" required minlength="6">
      <label>Confirmar contraseña</label>
      <input type="password" id="confirm" placeholder="Repite la contraseña" required>
      <button type="submit" id="btn">Guardar contraseña</button>
      <div class="msg ok" id="ok">✅ ¡Contraseña actualizada! Ya puedes iniciar sesión en la app.</div>
      <div class="msg err" id="err"></div>
    </form>
  </div>
  <script>
    document.getElementById('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pass = document.getElementById('pass').value;
      const confirm = document.getElementById('confirm').value;
      const btn = document.getElementById('btn');
      const ok = document.getElementById('ok');
      const err = document.getElementById('err');

      if (pass !== confirm) {
        err.textContent = '❌ Las contraseñas no coinciden';
        err.style.display = 'block';
        return;
      }

      btn.textContent = 'Guardando...';
      btn.disabled = true;
      err.style.display = 'none';

      try {
        const res = await fetch('/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: '${token}', password: pass }),
        });
        const data = await res.json();
        if (res.ok) {
          document.getElementById('form').innerHTML = 
            '<div class="msg ok" style="display:block">✅ ¡Contraseña actualizada! Ya puedes iniciar sesión en la app.</div>';
        } else {
          err.textContent = '❌ ' + (data.message ?? 'Error al actualizar');
          err.style.display = 'block';
          btn.textContent = 'Guardar contraseña';
          btn.disabled = false;
        }
      } catch {
        err.textContent = '❌ Error de conexión. Inténtalo de nuevo.';
        err.style.display = 'block';
        btn.textContent = 'Guardar contraseña';
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}