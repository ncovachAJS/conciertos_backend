import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WantToAttendDto } from './want-to-attend.dto';

@Injectable()
export class WantToAttendService {
  constructor(private readonly prisma: PrismaService) {}

  getAll(userId: string) {
    return this.prisma.wantToAttend.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });
  }

  async toggle(userId: string, dto: WantToAttendDto): Promise<{ added: boolean }> {
    const existing = await this.prisma.wantToAttend.findUnique({
      where: { userId_eventId: { userId, eventId: dto.eventId } },
    });

    if (existing) {
      await this.prisma.wantToAttend.delete({
        where: { userId_eventId: { userId, eventId: dto.eventId } },
      });
      return { added: false };
    }

    await this.prisma.wantToAttend.create({
      data: {
        userId,
        eventId: dto.eventId,
        artist: dto.artist,
        venue: dto.venue,
        city: dto.city,
        country: dto.country,
        date: new Date(dto.date),
        imageUrl: dto.imageUrl,
        ticketUrl: dto.ticketUrl,
      },
    });
    return { added: true };
  }
}
