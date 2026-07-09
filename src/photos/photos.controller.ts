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

@ApiTags('Photos')
@Controller()
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post('concerts/:concertId/photos')
  @ApiOperation({ summary: 'Añade una foto de recuerdo a un concierto' })
  @ApiParam({ name: 'concertId', description: 'Identificador del concierto' })
  @ApiBody({ type: CreatePhotoDto })
  @ApiResponse({ status: 201, description: 'Foto añadida correctamente.' })
  create(
    @Param('concertId') concertId: string,
    @Body() dto: CreatePhotoDto,
  ) {
    return this.photosService.create(concertId, dto);
  }

  @Get('concerts/:concertId/photos')
  @ApiOperation({ summary: 'Lista las fotos de un concierto' })
  @ApiParam({ name: 'concertId', description: 'Identificador del concierto' })
  @ApiResponse({ status: 200, description: 'Fotos obtenidas correctamente.' })
  findByConcert(@Param('concertId') concertId: string) {
    return this.photosService.findByConcert(concertId);
  }

  @Get('photos/feed')
  @ApiOperation({ summary: 'Feed global con todas las fotos' })
  @ApiResponse({ status: 200, description: 'Feed obtenido correctamente.' })
  feed() {
    return this.photosService.feed();
  }

  @Delete('photos/:id')
  @ApiOperation({ summary: 'Elimina una foto' })
  @ApiParam({ name: 'id', description: 'Identificador de la foto' })
  @ApiResponse({ status: 200, description: 'Foto eliminada correctamente.' })
  remove(@Param('id') id: string) {
    return this.photosService.remove(id);
  }
}
