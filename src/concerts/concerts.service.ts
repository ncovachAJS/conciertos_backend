import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateConcertDto } from './dto/create-concert.dto';
import { UpdateConcertDto } from './dto/update-concert.dto';

@Injectable()
export class ConcertsService {
  private readonly logger = new Logger(ConcertsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, pagination: { page: number; limit: number }) {
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.concert.findMany({
        where: { userId },
        orderBy: { date: 'desc' }, // consistente con el orden que usaba el front
        skip,
        take: limit,
      }),
      this.prisma.concert.count({ where: { userId } }),
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

  async create(userId: string, dto: CreateConcertDto) {
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
    });

    this.logger.log(`Concierto creado: ${concert.name} (${concert.id})`);
    return concert;
  }

  async update(userId: string, id: string, dto: UpdateConcertDto) {
    const concert = await this.prisma.concert.update({
      where: { id, userId },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });

    this.logger.log(`Concierto actualizado: ${concert.name} (${concert.id})`);
    return concert;
  }

  async remove(userId: string, id: string) {
    const concert = await this.prisma.concert.delete({
      where: { id, userId },
    });

    this.logger.log(`Concierto eliminado: ${concert.name} (${concert.id})`);
    return concert;
  }
}