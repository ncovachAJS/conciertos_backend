import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePhotoDto } from './dto/create-photo.dto';

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(private readonly prisma: PrismaService) {}

  create(concertId: string, dto: CreatePhotoDto) {
    return this.prisma.concertPhoto.create({
      data: {
        concertId,
        imageUrl: dto.imageUrl,
        caption: dto.caption ?? null,
      },
    });
  }

  findByConcert(concertId: string) {
    return this.prisma.concertPhoto.findMany({
      where: { concertId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Feed global: todas las fotos, más recientes primero, con datos del concierto. */
  feed() {
    return this.prisma.concertPhoto.findMany({
      orderBy: { createdAt: 'desc' },
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
    });
  }

  async remove(id: string) {
    const photo = await this.prisma.concertPhoto.delete({ where: { id } });

    this.logger.log(`Foto eliminada: ${photo.id}`);

    return photo;
  }
}
