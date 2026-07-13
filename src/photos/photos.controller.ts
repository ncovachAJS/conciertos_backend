import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { PhotosService } from './photos.service';
import { CreatePhotoDto } from './dto/create-photo.dto';

import { UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Photos')
@UseGuards(JwtAuthGuard)
@Controller()
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post('concerts/:concertId/photos')
  @ApiOperation({ summary: 'Añade una foto de recuerdo a un concierto' })
  @ApiParam({ name: 'concertId', description: 'Identificador del concierto' })
  @ApiBody({ type: CreatePhotoDto })
  @ApiResponse({ status: 201, description: 'Foto añadida correctamente.' })
  create(
  @Request() req,
  @Param('concertId') concertId: string,
  @Body() dto: CreatePhotoDto,
) {
  return this.photosService.create(req.user.id, concertId, dto);
}

  @Get('concerts/:concertId/photos')
  @ApiOperation({ summary: 'Lista las fotos de un concierto' })
  @ApiParam({ name: 'concertId', description: 'Identificador del concierto' })
  @ApiResponse({ status: 200, description: 'Fotos obtenidas correctamente.' })
  findByConcert(
  @Request() req,
  @Param('concertId') concertId: string,
) {
  return this.photosService.findByConcert(req.user.id, concertId);
}

  @Get('photos/feed')
  @ApiOperation({ summary: 'Feed global con todas las fotos' })
  @ApiResponse({ status: 200, description: 'Feed obtenido correctamente.' })
  feed(@Request() req) {
  return this.photosService.feed(req.user.id);
}

  @Delete('photos/:id')
  @ApiOperation({ summary: 'Elimina una foto' })
  @ApiParam({ name: 'id', description: 'Identificador de la foto' })
  @ApiResponse({ status: 200, description: 'Foto eliminada correctamente.' })
  remove(
  @Request() req,
  @Param('id') id: string,
) {
  return this.photosService.remove(req.user.id, id);
}
}
