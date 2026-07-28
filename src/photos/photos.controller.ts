import {
  Body, Controller, Delete, Get, Param,
  Post, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { PhotosService } from './photos.service';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiBearerAuth('JWT')
@ApiTags('Photos')
@UseGuards(JwtAuthGuard)
@Controller()
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post('concerts/:concertId/photos')
  @ApiOperation({ summary: 'Añade una foto a un concierto (con etiquetas opcional)' })
  @ApiParam({ name: 'concertId' })
  @ApiBody({ type: CreatePhotoDto })
  create(@Request() req, @Param('concertId') concertId: string, @Body() dto: CreatePhotoDto) {
    return this.photosService.create(req.user.id, concertId, dto);
  }

  @Get('concerts/:concertId/photos')
  @ApiOperation({ summary: 'Lista las fotos de un concierto' })
  @ApiParam({ name: 'concertId' })
  findByConcert(@Request() req, @Param('concertId') concertId: string) {
    return this.photosService.findByConcert(req.user.id, concertId);
  }

  @Get('photos/feed')
  @ApiOperation({ summary: 'Feed global paginado' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  feed(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.photosService.feed(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Delete('photos/:id')
  @ApiOperation({ summary: 'Elimina una foto' })
  @ApiParam({ name: 'id' })
  remove(@Request() req, @Param('id') id: string) {
    return this.photosService.remove(req.user.id, id);
  }

  // ── Etiquetado ────────────────────────────────────────────────────────────

  @Post('photos/:id/tag/:friendId')
  @ApiOperation({ summary: 'Etiquetar un amigo en una foto' })
  @ApiParam({ name: 'id', description: 'ID de la foto' })
  @ApiParam({ name: 'friendId', description: 'ID del amigo' })
  tagFriend(@Request() req, @Param('id') photoId: string, @Param('friendId') friendId: string) {
    return this.photosService.tagFriend(req.user.id, photoId, friendId);
  }

  @Delete('photos/:id/tag/:friendId')
  @ApiOperation({ summary: 'Quitar etiqueta de un amigo en una foto' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'friendId' })
  untagFriend(@Request() req, @Param('id') photoId: string, @Param('friendId') friendId: string) {
    return this.photosService.untagFriend(req.user.id, photoId, friendId);
  }
}