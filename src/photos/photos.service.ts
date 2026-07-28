import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePhotoDto } from './dto/create-photo.dto';

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, concertId: string, dto: CreatePhotoDto) {
    // El concierto debe ser propio o el usuario debe ser participante
    const concert = await this.prisma.concert.findFirst({
      where: {
        id: concertId,
        OR: [
          { userId },
          { participants: { some: { userId } } },
        ],
      },
    });

    if (!concert) {
      throw new NotFoundException('Concierto no encontrado');
    }

    return this.prisma.concertPhoto.create({
      data: {
        concertId,
        imageUrl: dto.imageUrl,
        caption: dto.caption ?? null,
        userId, // quién sube la foto
      },
    });
  }

  async findByConcert(userId: string, concertId: string) {
    // Verificar acceso
    const concert = await this.prisma.concert.findFirst({
      where: {
        id: concertId,
        OR: [
          { userId },
          { participants: { some: { userId } } },
        ],
      },
    });
    if (!concert) throw new NotFoundException('Concierto no encontrado');

    return this.prisma.concertPhoto.findMany({
      where: { concertId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  /** Feed: fotos propias + fotos de conciertos en los que estás etiquetado */
  async feed(userId: string, pagination: { page: number; limit: number }) {
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      concert: {
        OR: [
          { userId },
          { participants: { some: { userId } } },
        ],
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
          concert: {
            select: {
              id: true,
              name: true,
              artist: true,
              festival: true,
              city: true,
              venue: true,
              date: true,
              userId: true,
            },
          },
        },
      }),
      this.prisma.concertPhoto.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async remove(userId: string, id: string) {
    const photo = await this.prisma.concertPhoto.findFirst({
      where: {
        id,
        OR: [
          { userId }, // quién subió la foto
          { concert: { userId } }, // dueño del concierto
        ],
      },
    });

    if (!photo) {
      throw new NotFoundException('Foto no encontrada');
    }

    await this.prisma.concertPhoto.delete({ where: { id } });
    this.logger.log(`Foto eliminada: ${id}`);
    return photo;
  }
}