import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
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
    const { page = 1 } = pagination;
    const limit = Math.min(pagination.limit ?? 50, 200); // máximo 200 por página
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

  // Límite de conciertos para usuarios gratuitos
  static readonly FREE_CONCERT_LIMIT = 50;

  async create(userId: string, dto: CreateConcertDto) {
    this.logger.log(`DTO recibido: ${JSON.stringify(dto)}`);

    // Verificar límite de conciertos para usuarios gratuitos
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPro: true },
    });
    if (!user?.isPro) {
      const count = await this.prisma.concert.count({ where: { userId } });
      if (count >= ConcertsService.FREE_CONCERT_LIMIT) {
        throw new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            error: 'Payment Required',
            message: `Has alcanzado el límite de ${ConcertsService.FREE_CONCERT_LIMIT} conciertos de la versión gratuita`,
            code: 'PRO_REQUIRED',
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    }

    const concert = await this.prisma.concert.create({
      data: {
        name: dto.name ?? '',
        artist: dto.artist,
        date: new Date(dto.date),
        festival: dto.festival ?? '',
        venue: dto.venue ?? '',
        city: dto.city ?? '',
        description: dto.description ?? '',
        genre: dto.genre ?? '',
        imageUrl: dto.imageUrl ?? '',
        rating: dto.rating ?? 0,
        soundRating: dto.soundRating ?? 0,
        atmosphereRating: dto.atmosphereRating ?? 0,
        setlistRating: dto.setlistRating ?? 0,
        valueRating: dto.valueRating ?? 0,
        artistRating: dto.artistRating ?? 0,
        liked: dto.liked ?? false,
        favorite: dto.favorite ?? false,
        price: dto.price ?? 0,
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
        genre: concertData.genre,
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

  // ── Feed de actividad de amigos ──────────────────────────────────────────

  /**
   * Devuelve los últimos conciertos añadidos por amigos del usuario.
   * Solo se incluyen conciertos de amigos con amistad ACCEPTED.
   */
  async findFriendsActivity(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // Obtenemos los IDs de amigos aceptados
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      select: { senderId: true, receiverId: true },
    });

    const friendIds = friendships.map((f) =>
      f.senderId === userId ? f.receiverId : f.senderId,
    );

    if (friendIds.length === 0) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.concert.findMany({
        where: { userId: { in: friendIds } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: CONCERT_INCLUDE,
      }),
      this.prisma.concert.count({
        where: { userId: { in: friendIds } },
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
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
    const candidates = friendIds.filter((id) => id !== ownerId);
    if (!candidates.length) return;

    this.logger.log(`Etiquetando amigos: ${candidates.join(', ')} en concierto ${concertId}`);

    const [concertData, friendships] = await Promise.all([
      this.prisma.concert.findUnique({
        where: { id: concertId },
        select: { name: true, artist: true },
      }),
      // 1 sola query para verificar todas las amistades a la vez
      this.prisma.friendship.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [
            { senderId: ownerId, receiverId: { in: candidates } },
            { senderId: { in: candidates }, receiverId: ownerId },
          ],
        },
        select: { senderId: true, receiverId: true },
      }),
    ]);

    const concertName = concertData?.name || concertData?.artist || '';
    const confirmedFriendIds = new Set(
      friendships.map((fs) => (fs.senderId === ownerId ? fs.receiverId : fs.senderId)),
    );

    const validIds = candidates.filter((id) => confirmedFriendIds.has(id));
    if (!validIds.length) return;

    // Upserts en paralelo
    await Promise.all(
      validIds.map((friendId) =>
        this.prisma.concertParticipant.upsert({
          where: { concertId_userId: { concertId, userId: friendId } },
          create: { concertId, userId: friendId },
          update: {},
        }),
      ),
    );

    this.logger.log(`✅ Etiquetados: ${validIds.join(', ')} en concierto ${concertId}`);

    for (const friendId of validIds) {
      this.notificationsService.notifyConcertTag(ownerId, friendId, concertName, concertId).catch(() => {});
    }
  }

  // ── Comentarios ────────────────────────────────────────────────────────────

  async getComments(concertId: string) {
    return this.prisma.concertComment.findMany({
      where: { concertId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async addComment(userId: string, concertId: string, text: string) {
    if (!text?.trim()) throw new Error('El comentario no puede estar vacío');

    const [comment, concert] = await Promise.all([
      this.prisma.concertComment.create({
        data: { concertId, userId, text: text.trim() },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      this.prisma.concert.findUnique({
        where: { id: concertId },
        select: { userId: true, name: true, artist: true },
      }),
    ]);

    // Notificar al dueño del concierto (no al propio comentarista)
    if (concert && concert.userId !== userId) {
      const concertName = concert.name || concert.artist;
      this.notificationsService
        .notifyConcertComment(userId, concert.userId, concertName, concertId)
        .catch(() => {});
    }

    return comment;
  }

  async deleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.concertComment.findFirst({
      where: { id: commentId, userId },
    });
    if (!comment) throw new Error('Comentario no encontrado o sin permisos');
    return this.prisma.concertComment.delete({ where: { id: commentId } });
  }
}