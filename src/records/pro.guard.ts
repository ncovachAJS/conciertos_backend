import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Solo deja pasar a usuarios con `isPro = true` en la BBDD.
 * Se usa mientras la colección de discos está en fase de pruebas:
 * el flag se comprueba en servidor para que no dependa de la app.
 * Debe ir después de JwtAuthGuard (necesita req.user).
 */
@Injectable()
export class ProGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = await this.prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { isPro: true },
    });
    if (!user?.isPro) {
      throw new ForbiddenException('Función disponible solo para usuarios Pro');
    }
    return true;
  }
}
