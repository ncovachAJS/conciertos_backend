import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SpotifyService } from './spotify.service';

@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@ApiTags('Spotify')
@Controller('spotify')
export class SpotifyController {
  constructor(private readonly spotifyService: SpotifyService) {}

  @Get('artist')
  @ApiOperation({ summary: 'Busca un artista en Spotify por nombre' })
  @ApiQuery({ name: 'name', description: 'Nombre del artista', example: 'Metallica' })
  @ApiResponse({ status: 200, description: 'Datos del artista o null si no se encuentra.' })
  async artist(@Query('name') name: string) {
    if (!name?.trim()) {
      throw new BadRequestException('El parámetro "name" es obligatorio');
    }

    return this.spotifyService.searchArtist(name);
  }

  @Get('artist/:id/top-tracks')
  @ApiOperation({ summary: 'Canciones más populares de un artista (máx. 10)' })
  @ApiParam({ name: 'id', description: 'Spotify artist ID', example: '2ye2Wgw4gimLv2eAKyk1NB' })
  @ApiQuery({ name: 'market', required: false, description: 'Código de país ISO 3166-1 alpha-2', example: 'ES' })
  @ApiResponse({ status: 200, description: 'Lista de tracks en formato Spotify.' })
  async topTracks(
    @Param('id') artistId: string,
    @Query('market') market?: string,
  ) {
    if (!artistId?.trim()) {
      throw new BadRequestException('El parámetro "id" es obligatorio');
    }

    return this.spotifyService.getArtistTopTracks(artistId, market ?? 'ES');
  }
}