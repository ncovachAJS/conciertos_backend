import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

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

  async findByResetToken(token: string) {
    return this.prisma.user.findFirst({ where: { resetToken: token } });
  }

  async create(data: { name: string; email: string; password: string }) {
    return this.prisma.user.create({ data });
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    // Obtener URL del avatar actual para borrarlo de Cloudinary después
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    // Borrar el avatar anterior de Cloudinary en background (no bloqueamos la respuesta)
    if (current?.avatarUrl && current.avatarUrl !== avatarUrl) {
      this.uploadsService.deleteImage(current.avatarUrl).catch(() => {});
    }

    return updated;
  }

  async updateName(userId: string, name: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
  }

  async updatePassword(userId: string, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, passwordChangedAt: new Date() },
      select: { id: true },
    });
  }

  async setResetToken(userId: string, token: string, expiry: Date) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });
  }

  async clearResetToken(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { resetToken: null, resetTokenExpiry: null },
    });
  }

  async updateEmail(userId: string, email: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { email },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
  }

  async deleteAccount(userId: string) {
    // Elimina el usuario; las relaciones con onDelete:Cascade se borran en cascada.
    // Las que no lo tengan se borran primero explícitamente.
    await this.prisma.$transaction([
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({ where: { senderId: userId } }),
      this.prisma.deviceToken.deleteMany({ where: { userId } }),
      this.prisma.friendship.deleteMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      }),
      this.prisma.concert.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
  }

  async getMemberNumber(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    if (!user) return 0;
    return this.prisma.user.count({
      where: { createdAt: { lte: user.createdAt } },
    });
  }
}