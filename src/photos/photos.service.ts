import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { FriendsService } from '../friends/friends.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreatePhotoDto } from './dto/create-photo.dto';

const PARTICIPANT_SELECT = {
  id: true,
  user: { select: { id: true, name: true, avatarUrl: true } },
};

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly friendsService: FriendsService,
    private readonly notificationsService: NotificationsService,
    private readonly uploadsService: UploadsService,
  ) {}

  async create(userId: string, concertId: string, dto: CreatePhotoDto) {
    const concert = await this.prisma.concert.findFirst({
      where: {
        id: concertId,
        OR: [{ userId }, { participants: { some: { userId } } }],
      },
    });
    if (!concert) throw new NotFoundException('Concierto no encontrado');

    const photo = await this.prisma.concertPhoto.create({
      data: { concertId, imageUrl: dto.imageUrl, caption: dto.caption ?? null, userId },
      include: { participants: { select: PARTICIPANT_SELECT } },
    });

    if (dto.taggedFriendIds?.length) {
      await this._tagFriends(userId, photo.id, dto.taggedFriendIds);
    }

    return this.findOne(photo.id);
  }

  async findByConcert(userId: string, concertId: string) {
    const concert = await this.prisma.concert.findFirst({
      where: {
        id: concertId,
        OR: [{ userId }, { participants: { some: { userId } } }],
      },
    });
    if (!concert) throw new NotFoundException('Concierto no encontrado');

    // Buscar conciertos del mismo artista y fecha (pueden ser de otros usuarios)
    const sameDay = new Date(concert.date);
    sameDay.setHours(0, 0, 0, 0);
    const nextDay = new Date(sameDay);
    nextDay.setDate(nextDay.getDate() + 1);

    const relatedConcerts = await this.prisma.concert.findMany({
      where: {
        artist: { equals: concert.artist, mode: 'insensitive' },
        date: { gte: sameDay, lt: nextDay },
        id: { not: concertId },
      },
      select: { id: true },
    });

    const allConcertIds = [concertId, ...relatedConcerts.map(c => c.id)];

    // Fotos propias del concierto + fotos de conciertos relacionados donde está etiquetado
    return this.prisma.concertPhoto.findMany({
      where: {
        concertId: { in: allConcertIds },
        OR: [
          { userId },
          { userId: null, concert: { userId } },
          { participants: { some: { userId } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['id'],
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        participants: { select: PARTICIPANT_SELECT },
      },
    });
  }

  async feed(userId: string, pagination: { page: number; limit: number }) {
    const { page = 1 } = pagination;
    const limit = Math.min(pagination.limit ?? 50, 100); // máximo 100 por página
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { userId },                                              // fotos que subió él
        { participants: { some: { userId } } },                 // fotos donde está etiquetado
        { userId: null, concert: { userId } },                  // fotos antiguas de sus conciertos
      ],
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.concertPhoto.findMany({
        where,
        orderBy: { concert: { date: 'desc' } },
        skip,
        take: limit,
        distinct: ['id'],
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          participants: { select: PARTICIPANT_SELECT },
          concert: {
            select: { id: true, name: true, artist: true, festival: true, city: true, venue: true, date: true, userId: true },
          },
        },
      }),
      this.prisma.concertPhoto.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async remove(userId: string, id: string) {
    const photo = await this.prisma.concertPhoto.findFirst({
      where: { id, OR: [{ userId }, { concert: { userId } }] },
    });
    if (!photo) throw new NotFoundException('Foto no encontrada');
    await this.prisma.concertPhoto.delete({ where: { id } });
    // Borrar de Cloudinary en background — no bloqueamos la respuesta
    this.uploadsService.deleteImage(photo.imageUrl).catch(() => {});
    this.logger.log(`Foto eliminada: ${id}`);
    return photo;
  }

  async tagFriend(uploaderId: string, photoId: string, friendId: string) {
    this.logger.log(`tagFriend: foto=${photoId} friend=${friendId} uploader=${uploaderId}`);

    // Buscamos la foto — si no tiene userId (fotos antiguas) la aceptamos igualmente
    // si el uploader es participante o dueño del concierto
    const photo = await this.prisma.concertPhoto.findFirst({
      where: {
        id: photoId,
        OR: [
          { userId: uploaderId },
          { userId: null },
          { concert: { userId: uploaderId } },
          { concert: { participants: { some: { userId: uploaderId } } } },
        ],
      },
    });
    if (!photo) throw new NotFoundException('Foto no encontrada');

    const areFriends = await this.friendsService.areFriends(uploaderId, friendId);
    this.logger.log(`areFriends: ${areFriends}`);
    if (!areFriends) throw new ForbiddenException('Solo puedes etiquetar a tus amigos');

    await this.prisma.photoParticipant.upsert({
      where: { photoId_userId: { photoId, userId: friendId } },
      create: { photoId, userId: friendId },
      update: {},
    });
    this.logger.log(`✅ PhotoParticipant creado: foto=${photoId} friend=${friendId}`);

    await this.prisma.concertParticipant.upsert({
      where: { concertId_userId: { concertId: photo.concertId, userId: friendId } },
      create: { concertId: photo.concertId, userId: friendId },
      update: {},
    });
    this.logger.log(`✅ ConcertParticipant creado: concierto=${photo.concertId} friend=${friendId}`);

    // Notificar al etiquetado
    const concert = await this.prisma.concert.findUnique({
      where: { id: photo.concertId },
      select: { name: true, artist: true },
    });
    const concertName = concert?.name ?? concert?.artist ?? '';
    this.notificationsService.notifyPhotoTag(uploaderId, friendId, concertName, photoId, photo.concertId).catch(() => {});

    return this.findOne(photoId);
  }

  async untagFriend(uploaderId: string, photoId: string, friendId: string) {
    const photo = await this.prisma.concertPhoto.findFirst({
      where: { id: photoId, userId: uploaderId },
    });
    if (!photo) throw new NotFoundException('Foto no encontrada o no eres el autor');

    await this.prisma.photoParticipant.deleteMany({ where: { photoId, userId: friendId } });
    return this.findOne(photoId);
  }

  private async findOne(photoId: string) {
    return this.prisma.concertPhoto.findUnique({
      where: { id: photoId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        participants: { select: PARTICIPANT_SELECT },
      },
    });
  }

  private async _tagFriends(uploaderId: string, photoId: string, friendIds: string[]) {
    const photo = await this.prisma.concertPhoto.findUnique({ where: { id: photoId } });
    if (!photo) return;

    await Promise.all(
      friendIds
        .filter((id) => id !== uploaderId)
        .map(async (friendId) => {
          const ok = await this.friendsService.areFriends(uploaderId, friendId);
          if (!ok) return;

          await Promise.all([
            // Etiquetar en la foto
            this.prisma.photoParticipant.upsert({
              where: { photoId_userId: { photoId, userId: friendId } },
              create: { photoId, userId: friendId },
              update: {},
            }),
            // Auto-añadir como participante del concierto
            this.prisma.concertParticipant.upsert({
              where: { concertId_userId: { concertId: photo.concertId, userId: friendId } },
              create: { concertId: photo.concertId, userId: friendId },
              update: {},
            }),
          ]);
        }),
    );
  }
}