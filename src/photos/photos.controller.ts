import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

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
  @ApiOperation({ summary: 'Feed global paginado con todas las fotos' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({ status: 200, description: 'Feed obtenido correctamente.' })
  feed(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.photosService.feed(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Delete('photos/:id')
  @ApiOperation({ summary: 'Elimina una foto' })
  @ApiParam({ name: 'id', description: 'Identificador de la foto' })
  @ApiResponse({ status: 200, description: 'Foto eliminada correctamente.' })
  remove(@Request() req, @Param('id') id: string) {
    return this.photosService.remove(req.user.id, id);
  }
}