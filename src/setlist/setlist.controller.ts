import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SetlistService } from './setlist.service';

@Controller('setlist')
export class SetlistController {
  constructor(private readonly setlistService: SetlistService) {}

  @Get('search')
  async search(
    @Query('artistName') artistName: string,
    @Query('date') date: string,
    @Query('p') p?: string,
  ) {
    if (!artistName || !date) {
      throw new HttpException(
        'artistName y date son requeridos',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.setlistService.searchSetlist({
        artistName,
        date,
        p: p ? parseInt(p, 10) : 1,
      });
    } catch (err: any) {
      const status = err?.status ?? HttpStatus.BAD_GATEWAY;
      throw new HttpException(
        err?.data ?? err?.message ?? 'Error al consultar setlist.fm',
        status,
      );
    }
  }
}
