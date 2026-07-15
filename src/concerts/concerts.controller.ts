import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
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

import { ConcertsService } from './concerts.service';
import { CreateConcertDto } from './dto/create-concert.dto';
import { UpdateConcertDto } from './dto/update-concert.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@ApiTags('Concerts')
@Controller('concerts')
export class ConcertsController {
  constructor(private readonly concertsService: ConcertsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtiene los conciertos del usuario (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({ status: 200, description: 'Lista paginada de conciertos.' })
  findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.concertsService.findAll(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Crea un nuevo concierto' })
  @ApiBody({ type: CreateConcertDto })
  @ApiResponse({ status: 201, description: 'Concierto creado correctamente.' })
  create(@Req() req: any, @Body() dto: CreateConcertDto) {
    return this.concertsService.create(req.user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualiza un concierto' })
  @ApiParam({ name: 'id', description: 'Identificador del concierto' })
  @ApiBody({ type: UpdateConcertDto })
  @ApiResponse({ status: 200, description: 'Concierto actualizado.' })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateConcertDto,
  ) {
    return this.concertsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina un concierto' })
  @ApiParam({ name: 'id', description: 'Identificador del concierto' })
  @ApiResponse({ status: 200, description: 'Concierto eliminado.' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.concertsService.remove(req.user.id, id);
  }
}