import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ConcertsService } from './concerts.service';
import { CreateConcertDto } from './dto/create-concert.dto';
import { UpdateConcertDto } from './dto/update-concert.dto';

@ApiTags('Concerts')
@Controller('concerts')
export class ConcertsController {
  constructor(
    private readonly concertsService: ConcertsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Obtiene todos los conciertos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de conciertos obtenida correctamente.',
  })
  findAll() {
    return this.concertsService.findAll();
  }

  @Post()
  @ApiOperation({
    summary: 'Crea un nuevo concierto',
  })
  @ApiBody({
    type: CreateConcertDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Concierto creado correctamente.',
  })
  create(
    @Body() dto: CreateConcertDto,
  ) {
    return this.concertsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualiza un concierto',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del concierto',
  })
  @ApiBody({
    type: UpdateConcertDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Concierto actualizado correctamente.',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateConcertDto,
  ) {
    return this.concertsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Elimina un concierto',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador del concierto',
  })
  @ApiResponse({
    status: 200,
    description: 'Concierto eliminado correctamente.',
  })
  remove(
    @Param('id') id: string,
  ) {
    return this.concertsService.remove(id);
  }
}