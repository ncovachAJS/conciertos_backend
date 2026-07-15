import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, createdAt: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: { name: string; email: string; password: string }) {
    return this.prisma.user.create({ data });
  }

  /**
   * Calcula el número de socio contando cuántos usuarios se registraron
   * antes o al mismo tiempo que el usuario dado.
   *
   * ❌ Antes: cargaba TODOS los usuarios en memoria para hacer indexOf.
   * ✅ Ahora: dos queries O(1) — un findUnique + un COUNT con WHERE.
   */
  async getMemberNumber(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    if (!user) return 0;

    const count = await this.prisma.user.count({
      where: { createdAt: { lte: user.createdAt } },
    });

    return count;
  }
}