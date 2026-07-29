import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { FriendsService } from '../friends/friends.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateConcertDto } from './dto/create-concert.dto';
import { UpdateConcertDto } from './dto/update-concert.dto';

const PARTICIPANT_SELECT = {
  id: true,
  user: { select: { id: true, name: true, avatarUrl: true } },
};

const CONCERT_INCLUDE = {
  participants: { select: PARTICIPANT_SELECT },
  user: { select: { id: true, name: true, avatarUrl: true } },
};

@Injectable()
export class ConcertsService {
  private readonly logger = new Logger(ConcertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly friendsService: FriendsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(userId: string, pagination: { page: number; limit: number }) {
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.concert.findMany({
        where: {
          OR: [
            { userId },
            { participants: { some: { userId } } },
          ],
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: CONCERT_INCLUDE,
      }),
      this.prisma.concert.count({
        where: {
          OR: [
            { userId },
            { participants: { some: { userId } } },
          ],
        },
      }),
    ]);

    // Deduplicar: si hay un concierto propio y uno compartido del mismo artista+fecha,
    // quedarse solo con el propio — PERO siempre incluir todos los IDs únicos
    // para que las notificaciones puedan resolver el concierto por ID
    const seen = new Map<string, string>(); // key -> concertId propio
    const deduped = data
      .filter((concert) => {
        const date = concert.date;
        const key = `${concert.artist.toLowerCase()}|${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        const isOwn = concert.userId === userId;
        if (isOwn) {
          seen.set(key, concert.id);
          return true;
        }
        // Incluir siempre el concierto compartido — el frontend decide qué mostrar
        return true;
      })
      .map((concert) => {
        // Si el concierto no es del usuario, resetear valores personales
        if (concert.userId !== userId) {
          return {
            ...concert,
            rating: 0,
            liked: false,
            favorite: false,
          };
        }
        return concert;
      });

    return {
      data: deduped,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(userId: string, dto: CreateConcertDto) {
    this.logger.log(`DTO recibido: ${JSON.stringify(dto)}`);
    const concert = await this.prisma.concert.create({
      data: {
        name: dto.name ?? '',
        artist: dto.artist,
        date: new Date(dto.date),
        festival: dto.festival ?? '',
        venue: dto.venue ?? '',
        city: dto.city ?? '',
        description: dto.description ?? '',
        imageUrl: dto.imageUrl ?? '',
        rating: dto.rating ?? 0,
        liked: dto.liked ?? false,
        favorite: dto.favorite ?? false,
        user: { connect: { id: userId } },
      },
      include: CONCERT_INCLUDE,
    });

    // Etiquetar amigos si vienen en el DTO
    if (dto.taggedFriendIds?.length) {
      await this._tagFriends(userId, concert.id, dto.taggedFriendIds);
    }

    this.logger.log(`Concierto creado: ${concert.name} (${concert.id})`);

    // Notificar a amigos que añadiste un concierto
    this.notificationsService.notifyFriendConcert(userId, concert.name ?? concert.artist, concert.id).catch(() => {});

    return this.findOne(concert.id);
  }

  async update(userId: string, id: string, dto: UpdateConcertDto) {
    // Solo el dueño puede editar
    const concert = await this.prisma.concert.findFirst({ where: { id, userId } });
    if (!concert) throw new NotFoundException('Concierto no encontrado');

    const { taggedFriendIds, ...concertData } = dto;

    const updated = await this.prisma.concert.update({
      where: { id },
      data: {
        ...concertData,
        date: concertData.date ? new Date(concertData.date) : undefined,
      },
      include: CONCERT_INCLUDE,
    });

    // Si viene lista de etiquetados, sincronizamos
    if (dto.taggedFriendIds !== undefined) {
      // Eliminar todos los existentes y volver a crear
      await this.prisma.concertParticipant.deleteMany({ where: { concertId: id } });
      if (dto.taggedFriendIds.length) {
        await this._tagFriends(userId, id, dto.taggedFriendIds);
      }
    }

    this.logger.log(`Concierto actualizado: ${updated.name} (${updated.id})`);
    return this.findOne(id);
  }

  async remove(userId: string, id: string) {
    const concert = await this.prisma.concert.findFirst({ where: { id, userId } });
    if (!concert) throw new NotFoundException('Concierto no encontrado');

    await this.prisma.concert.delete({ where: { id } });
    this.logger.log(`Concierto eliminado: ${concert.name} (${concert.id})`);
    return concert;
  }

  // ── Etiquetado ───────────────────────────────────────────────────────────

  async tagFriend(ownerId: string, concertId: string, friendId: string) {
    const concert = await this.prisma.concert.findFirst({
      where: { id: concertId, userId: ownerId },
    });
    if (!concert) throw new NotFoundException('Concierto no encontrado');

    const areFriends = await this.friendsService.areFriends(ownerId, friendId);
    if (!areFriends) {
      throw new ForbiddenException('Solo puedes etiquetar a tus amigos');
    }

    if (friendId === ownerId) {
      throw new BadRequestException('No puedes etiquetarte a ti mismo');
    }

    await this.prisma.concertParticipant.upsert({
      where: { concertId_userId: { concertId, userId: friendId } },
      create: { concertId, userId: friendId },
      update: {},
    });

    return this.findOne(concertId);
  }

  async untagFriend(ownerId: string, concertId: string, friendId: string) {
    const concert = await this.prisma.concert.findFirst({
      where: { id: concertId, userId: ownerId },
    });
    if (!concert) throw new NotFoundException('Concierto no encontrado');

    await this.prisma.concertParticipant.deleteMany({
      where: { concertId, userId: friendId },
    });

    return this.findOne(concertId);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async findOne(concertId: string) {
    return this.prisma.concert.findUnique({
      where: { id: concertId },
      include: CONCERT_INCLUDE,
    });
  }

  private async _tagFriends(
    ownerId: string,
    concertId: string,
    friendIds: string[],
  ) {
    this.logger.log(`Etiquetando amigos: ${friendIds.join(', ')} en concierto ${concertId}`);

    const concertData = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { name: true, artist: true },
    });
    const concertName = concertData?.name || concertData?.artist || '';

    for (const friendId of friendIds) {
      if (friendId === ownerId) continue;
      const areFriends = await this.friendsService.areFriends(ownerId, friendId);
      this.logger.log(`areFriends(${ownerId}, ${friendId}) = ${areFriends}`);
      if (!areFriends) continue;

      await this.prisma.concertParticipant.upsert({
        where: { concertId_userId: { concertId, userId: friendId } },
        create: { concertId, userId: friendId },
        update: {},
      });
      this.logger.log(`✅ Etiquetado: ${friendId} en concierto ${concertId}`);

      this.notificationsService.notifyConcertTag(ownerId, friendId, concertName, concertId).catch(() => {});
    }
  }
}