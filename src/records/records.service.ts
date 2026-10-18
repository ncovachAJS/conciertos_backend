import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecordDto, UpdateRecordDto } from './records.dto';

@Injectable()
export class RecordsService {
  constructor(private readonly prisma: PrismaService) {}

  getAll(userId: string) {
    return this.prisma.record.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateRecordDto) {
    try {
      return await this.prisma.record.create({
        data: { ...dto, format: dto.format ?? 'VINYL', userId },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Este disco ya está en tu colección');
      }
      throw e;
    }
  }

  async update(userId: string, id: string, dto: UpdateRecordDto) {
    await this.assertOwner(userId, id);
    return this.prisma.record.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.record.delete({ where: { id } });
    return { deleted: true };
  }

  private async assertOwner(userId: string, id: string) {
    const record = await this.prisma.record.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!record) throw new NotFoundException('Disco no encontrado');
  }
}
