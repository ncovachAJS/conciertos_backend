import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateConcertDto } from './dto/create-concert.dto';
import { UpdateConcertDto } from './dto/update-concert.dto';

@Injectable()
export class ConcertsService {

    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async findAll() {

        return this.prisma.concert.findMany({
            orderBy: {
                date: 'asc',
            },
        });

    }

    async create(dto: CreateConcertDto) {

        return this.prisma.concert.create({

            data: {

                name: dto.name,
                artist: dto.artist,
                date: new Date(dto.date),

                festival: dto.festival,
                venue: dto.venue,

                description: dto.description ?? '',
                imageUrl: dto.imageUrl ?? '',

                rating: dto.rating ?? 0,
                liked: dto.liked ?? false,

            },

        });

    }

    async update(id: string, dto: UpdateConcertDto) {
        return this.prisma.concert.update({
            where: {
                id,
            },
            data: {
                ...dto,
                date: dto.date ? new Date(dto.date) : undefined,
            },
        });
    }

    async remove(id: string) {
        return this.prisma.concert.delete({
            where: {
                id,
            },
        });
    }

}