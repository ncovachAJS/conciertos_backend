import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendshipStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Buscar usuarios por nombre o email ──────────────────────────────────

  async searchUsers(currentUserId: string, q: string) {
    if (!q || q.trim().length < 2) return [];

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: { id: true, name: true, email: true, avatarUrl: true },
      take: 20,
    });

    // Añadir estado de amistad para cada resultado
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: { in: users.map((u) => u.id) } },
          { receiverId: currentUserId, senderId: { in: users.map((u) => u.id) } },
        ],
      },
    });

    return users.map((u) => {
      const fs = friendships.find(
        (f) => f.senderId === u.id || f.receiverId === u.id,
      );
      return {
        ...u,
        friendshipStatus: fs?.status ?? null,
        friendshipId: fs?.id ?? null,
        isSender: fs?.senderId === currentUserId,
      };
    });
  }

  // ── Enviar solicitud ─────────────────────────────────────────────────────

  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException('No puedes enviarte una solicitud a ti mismo');
    }

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException('Ya existe una solicitud entre estos usuarios');
    }

    const receiver = await this.prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) throw new NotFoundException('Usuario no encontrado');

    const result = await this.prisma.friendship.create({
      data: { senderId, receiverId, status: FriendshipStatus.PENDING },
      include: {
        receiver: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    this.notificationsService.notifyFriendRequest(senderId, receiverId).catch(() => {});
    return result;
  }

  // ── Aceptar solicitud ────────────────────────────────────────────────────

  async acceptRequest(userId: string, friendshipId: string) {
    const fs = await this.prisma.friendship.findFirst({
      where: { id: friendshipId, receiverId: userId, status: FriendshipStatus.PENDING },
    });

    if (!fs) throw new NotFoundException('Solicitud no encontrada');

    const result = await this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: FriendshipStatus.ACCEPTED },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    this.notificationsService.notifyFriendAccepted(userId, result.senderId).catch(() => {});
    return result;
  }

  // ── Rechazar / cancelar solicitud ────────────────────────────────────────

  async removeRequest(userId: string, friendshipId: string) {
    const fs = await this.prisma.friendship.findFirst({
      where: {
        id: friendshipId,
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
    });

    if (!fs) throw new NotFoundException('Solicitud no encontrada');

    return this.prisma.friendship.delete({ where: { id: friendshipId } });
  }

  // ── Lista de amigos aceptados ────────────────────────────────────────────

  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, email: true } },
        receiver: { select: { id: true, name: true, avatarUrl: true, email: true } },
      },
    });

    // Devolver el amigo (no el usuario actual) con el friendshipId
    return friendships.map((fs) => ({
      friendshipId: fs.id,
      friend: fs.senderId === userId ? fs.receiver : fs.sender,
    }));
  }

  // ── Solicitudes pendientes recibidas ─────────────────────────────────────

  async getPendingRequests(userId: string) {
    return this.prisma.friendship.findMany({
      where: { receiverId: userId, status: FriendshipStatus.PENDING },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Estadísticas de un amigo (para logros) ──────────────────────────────

  async getFriendStats(requesterId: string, friendId: string) {
    const friends = await this.areFriends(requesterId, friendId);
    if (!friends) throw new Error('No sois amigos');

    // Incluimos conciertos propios + conciertos en los que fue etiquetado,
    // igual que el perfil propio del usuario.
    const concerts = await this.prisma.concert.findMany({
      where: {
        OR: [
          { userId: friendId },
          { participants: { some: { userId: friendId } } },
        ],
      },
      select: { artist: true, festival: true, city: true, date: true, rating: true },
    });

    const uniqueArtists = new Set(concerts.map((c) => c.artist.trim().toLowerCase()).filter(Boolean)).size;
    const uniqueFestivals = new Set(concerts.map((c) => c.festival.trim().toLowerCase()).filter(Boolean)).size;
    const uniqueCities = new Set(concerts.map((c) => c.city?.trim().toLowerCase()).filter(Boolean)).size;
    const totalRated = concerts.filter((c) => c.rating > 0).length;
    const dates = concerts.map((c) => c.date.getFullYear()).filter(Boolean);
    const oldestYear = dates.length > 0 ? Math.min(...dates) : 0;

    return {
      totalConcerts: concerts.length,
      uniqueArtists,
      uniqueFestivals,
      uniqueCities,
      totalRated,
      oldestYear,
    };
  }

  // ── Próximos conciertos propios de un amigo ──────────────────────────────

  async getFriendUpcomingConcerts(requesterId: string, friendId: string) {
    const friends = await this.areFriends(requesterId, friendId);
    if (!friends) throw new Error('No sois amigos');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.concert.findMany({
      where: {
        userId: friendId,
        date: { gte: today },
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        name: true,
        artist: true,
        festival: true,
        date: true,
        imageUrl: true,
        venue: true,
        city: true,
      },
    });
  }

  // ── Verificar que dos usuarios son amigos ────────────────────────────────

  async areFriends(userAId: string, userBId: string): Promise<boolean> {
    const fs = await this.prisma.friendship.findFirst({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { senderId: userAId, receiverId: userBId },
          { senderId: userBId, receiverId: userAId },
        ],
      },
    });
    return !!fs;
  }
}