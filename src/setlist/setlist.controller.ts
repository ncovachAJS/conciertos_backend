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

  /**
   * GET /setlist/search
   *
   * Modos:
   *  - Búsqueda por concierto concreto: artistName + date (dd-MM-yyyy)
   *  - Búsqueda paginada por artista:   artistName  (sin date)
   *  - Búsqueda paginada por festival:  tourName
   *
   * Parámetro opcional: p (página, por defecto 1)
   */
  @Get('search')
  async search(
    @Query('artistName') artistName?: string,
    @Query('tourName') tourName?: string,
    @Query('date') date?: string,
    @Query('p') p?: string,
  ) {
    if (!artistName && !tourName) {
      throw new HttpException(
        'Se requiere artistName o tourName',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.setlistService.searchSetlist({
        artistName,
        tourName,
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
