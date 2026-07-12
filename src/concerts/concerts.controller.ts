import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
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

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@ApiTags('Concerts')
@Controller('concerts')
export class ConcertsController {
  constructor(private readonly concertsService: ConcertsService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtiene todos los conciertos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de conciertos obtenida correctamente.',
  })
  findAll(@Req() req: any) {
    return this.concertsService.findAll(req.user.id);
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
  create(@Req() req: any, @Body() dto: CreateConcertDto) {
    return this.concertsService.create(req.user.id, dto);
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
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateConcertDto,
  ) {
    return this.concertsService.update(req.user.id, id, dto);
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
  remove(@Req() req: any, @Param('id') id: string) {
    return this.concertsService.remove(req.user.id, id);
  }
}
