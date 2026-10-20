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

    // Se devuelven siempre todos los conciertos (propios y compartidos): el frontend
    // decide qué mostrar y las notificaciones necesitan resolver el concierto por ID.
    const deduped = data
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
        visibleToFriends: dto.visibleToFriends ?? true,
        user: { connect: { id: userId } },
      },
      include: CONCERT_INCLUDE,
    });

    // Etiquetar amigos si vienen en el DTO
    if (dto.taggedFriendIds?.length) {
      await this._tagFriends(userId, concert.id, dto.taggedFriendIds);
    }

    this.logger.log(`Concierto creado: ${concert.name} (${concert.id})`);

    // Notificar a amigos que añadiste un concierto — solo si es visible para ellos
    if (concert.visibleToFriends) {
      this.notificationsService.notifyFriendConcert(userId, concert.name ?? concert.artist, concert.id).catch(() => {});
    }

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
    const safeLimit = Math.min(limit, 50); // máximo 50 por página para evitar scraping masivo
    const skip = (page - 1) * safeLimit;

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
        where: { userId: { in: friendIds }, visibleToFriends: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: CONCERT_INCLUDE,
      }),
      this.prisma.concert.count({
        where: { userId: { in: friendIds }, visibleToFriends: true },
      }),
    ]);

    return {
      data,
      meta: { total, page, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) },
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

  /**
   * Comprueba que el usuario puede ver el concierto: es dueño, participante
   * o amigo del dueño. Lanza 404/403 si no.
   */
  private async assertCanAccessConcert(userId: string, concertId: string) {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: {
        userId: true,
        name: true,
        artist: true,
        participants: { select: { userId: true } },
      },
    });

    if (!concert) throw new NotFoundException('Concierto no encontrado');

    const isOwner = concert.userId === userId;
    const isParticipant = concert.participants.some((p) => p.userId === userId);

    if (!isOwner && !isParticipant) {
      const areFriends = await this.friendsService.areFriends(userId, concert.userId);
      if (!areFriends) throw new ForbiddenException('Sin acceso a este concierto');
    }

    return concert;
  }

  async getComments(userId: string, concertId: string) {
    await this.assertCanAccessConcert(userId, concertId);

    return this.prisma.concertComment.findMany({
      where: { concertId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async addComment(userId: string, concertId: string, text: string) {
    if (!text?.trim()) throw new BadRequestException('El comentario no puede estar vacío');

    // Mismo control de acceso que al leer comentarios (antes cualquiera podía comentar)
    const concert = await this.assertCanAccessConcert(userId, concertId);

    const comment = await this.prisma.concertComment.create({
      data: { concertId, userId, text: text.trim() },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Notificar al dueño del concierto (no al propio comentarista)
    if (concert.userId !== userId) {
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
    if (!comment) throw new NotFoundException('Comentario no encontrado o sin permisos');
    return this.prisma.concertComment.delete({ where: { id: commentId } });
  }
}