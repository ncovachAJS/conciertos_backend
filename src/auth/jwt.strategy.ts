import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: any) {
    // Si el usuario cambió su contraseña después de que se emitió el token,
    // lo invalidamos. Esto evita que sesiones comprometidas sigan activas
    // sin necesitar una blacklist completa.
    if (payload.iat) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { passwordChangedAt: true },
      });
      if (
        user?.passwordChangedAt &&
        payload.iat * 1000 < user.passwordChangedAt.getTime()
      ) {
        throw new UnauthorizedException('Sesión expirada. Inicia sesión de nuevo.');
      }
    }

    return {
      id: payload.sub,
      email: payload.email,
    };
  }
}