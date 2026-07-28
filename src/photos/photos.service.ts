import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { FriendsService } from '../friends/friends.service';
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

    return this.prisma.concertPhoto.findMany({
      where: { concertId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        participants: { select: PARTICIPANT_SELECT },
      },
    });
  }

  async feed(userId: string, pagination: { page: number; limit: number }) {
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      concert: {
        OR: [{ userId }, { participants: { some: { userId } } }],
      },
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.concertPhoto.findMany({
        where,
        orderBy: { concert: { date: 'desc' } },
        skip,
        take: limit,
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

    for (const friendId of friendIds) {
      if (friendId === uploaderId) continue;
      const ok = await this.friendsService.areFriends(uploaderId, friendId);
      if (!ok) continue;

      // Etiquetar en la foto
      await this.prisma.photoParticipant.upsert({
        where: { photoId_userId: { photoId, userId: friendId } },
        create: { photoId, userId: friendId },
        update: {},
      });

      // Auto-añadir como participante del concierto
      await this.prisma.concertParticipant.upsert({
        where: { concertId_userId: { concertId: photo.concertId, userId: friendId } },
        create: { concertId: photo.concertId, userId: friendId },
        update: {},
      });
    }
  }
}