import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.usersService.findByEmail(dto.email);
    if (exists) {
      throw new BadRequestException('Ya existe un usuario con ese email');
    }
    const password = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password,
    });
    const memberNumber = await this.usersService.getMemberNumber(user.id);
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
        memberNumber,
      },
    };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }
    const memberNumber = await this.usersService.getMemberNumber(user.id);
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
        memberNumber,
      },
    };
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) return null;
    const memberNumber = await this.usersService.getMemberNumber(user.id);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      memberNumber,
    };
  }

  // ── Password reset ─────────────────────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    // Siempre respondemos igual para no revelar si el email existe
    if (!user) return { message: 'Si el email existe, recibirás un enlace.' };

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.usersService.setResetToken(user.id, token, expiry);
    await this.emailService.sendPasswordReset(email, token);

    return { message: 'Si el email existe, recibirás un enlace.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);

    if (!user || !user.resetTokenExpiry) {
      throw new BadRequestException('Token inválido o expirado');
    }

    if (new Date() > user.resetTokenExpiry) {
      await this.usersService.clearResetToken(user.id);
      throw new BadRequestException('El enlace ha expirado. Solicita uno nuevo.');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 6 caracteres',
      );
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user.id, hashed);
    await this.usersService.clearResetToken(user.id);

    return { message: 'Contraseña actualizada correctamente' };
  }
}