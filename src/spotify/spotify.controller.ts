import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
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
}