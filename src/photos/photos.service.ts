import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePhotoDto } from './dto/create-photo.dto';

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, concertId: string, dto: CreatePhotoDto) {
    const concert = await this.prisma.concert.findFirst({
      where: { id: concertId, userId },
    });

    if (!concert) {
      throw new NotFoundException('Concierto no encontrado');
    }

    return this.prisma.concertPhoto.create({
      data: {
        concertId,
        imageUrl: dto.imageUrl,
        caption: dto.caption ?? null,
      },
    });
  }

  async findByConcert(userId: string, concertId: string) {
    return this.prisma.concertPhoto.findMany({
      where: { concertId, concert: { userId } },
      orderBy: {
        concert: {
          date: 'desc',
        },
      },
    });
  }

  /** Feed paginado: fotos más recientes primero con datos del concierto. */
  async feed(userId: string, pagination: { page: number; limit: number }) {
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.concertPhoto.findMany({
        where: { concert: { userId } },
        orderBy: {
          concert: {
            date: 'desc',
          },
        },
        skip,
        take: limit,
        include: {
          concert: {
            select: {
              id: true,
              name: true,
              artist: true,
              festival: true,
              city: true,
              venue: true,
              date: true,
            },
          },
        },
      }),
      this.prisma.concertPhoto.count({
        where: { concert: { userId } },
      }),
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
      where: { id, concert: { userId } },
    });

    if (!photo) {
      throw new NotFoundException('Foto no encontrada');
    }

    await this.prisma.concertPhoto.delete({ where: { id } });

    this.logger.log(`Foto eliminada: ${id}`);
    return photo;
  }
}
