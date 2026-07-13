import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePhotoDto } from './dto/create-photo.dto';

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
  userId: string,
  concertId: string,
  dto: CreatePhotoDto,
) {
  const concert = await this.prisma.concert.findFirst({
    where: {
      id: concertId,
      userId,
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
    },
  });
}

  async findByConcert(
  userId: string,
  concertId: string,
) {
  return this.prisma.concertPhoto.findMany({
    where: {
      concertId,
      concert: {
        userId,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

  /** Feed global: todas las fotos, más recientes primero, con datos del concierto. */
  feed(userId: string) {
  return this.prisma.concertPhoto.findMany({
    where: {
      concert: {
        userId,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
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

 async remove(
  userId: string,
  id: string,
) {
  const photo = await this.prisma.concertPhoto.findFirst({
    where: {
      id,
      concert: {
        userId,
      },
    },
  });

  if (!photo) {
    throw new NotFoundException('Foto no encontrada');
  }

  await this.prisma.concertPhoto.delete({
    where: {
      id,
    },
  });

  this.logger.log(`Foto eliminada: ${id}`);

  return photo;
}
}
