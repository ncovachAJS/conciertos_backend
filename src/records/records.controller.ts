import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DiscogsService } from './discogs.service';
import { ProGuard } from './pro.guard';
import { CreateRecordDto, UpdateRecordDto } from './records.dto';
import { RecordsService } from './records.service';

@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, ProGuard)
@ApiTags('Records')
@Controller('records')
export class RecordsController {
  constructor(
    private readonly service: RecordsService,
    private readonly discogs: DiscogsService,
  ) {}

  @Get()
  getAll(@Req() req: any) {
    return this.service.getAll(req.user.id);
  }

  /** GET /records/search?q=...&format=VINYL|CD&page=1  ó  ?barcode=... */
  @Get('search')
  @Throttle({ global: { ttl: 60_000, limit: 30 } })
  async search(
    @Query('q') q?: string,
    @Query('barcode') barcode?: string,
    @Query('format') format?: string,
    @Query('page') page?: string,
  ) {
    if (!q?.trim() && !barcode?.trim()) {
      throw new BadRequestException('Se requiere q o barcode');
    }
    try {
      return await this.discogs.search({
        q: q?.trim(),
        barcode: barcode?.trim(),
        format: format === 'VINYL' || format === 'CD' ? format : undefined,
        page: page ? parseInt(page, 10) || 1 : 1,
      });
    } catch (err: any) {
      throw new HttpException(
        'Error al consultar Discogs',
        err?.status === 429
          ? HttpStatus.TOO_MANY_REQUESTS
          : HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get('discogs/:id')
  async release(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.discogs.getRelease(id);
    } catch (err: any) {
      throw new HttpException(
        'Error al consultar Discogs',
        err?.status === 404 ? HttpStatus.NOT_FOUND : HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateRecordDto) {
    return this.service.create(req.user.id, dto);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRecordDto,
  ) {
    return this.service.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}
