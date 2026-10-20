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
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { parseIntParam } from '../common/utils/parse-int';

@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@ApiTags('Concerts')
@Controller('concerts')
export class ConcertsController {
  constructor(private readonly concertsService: ConcertsService) {}

  @Get('friends-activity')
  @ApiOperation({ summary: 'Feed de actividad de amigos (últimos conciertos)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Feed de conciertos de amigos.' })
  findFriendsActivity(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.concertsService.findFriendsActivity(
      req.user.id,
      parseIntParam(page, 1),
      parseIntParam(limit, 20, { max: 100 }),
    );
  }

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
      page: parseIntParam(page, 1),
      limit: parseIntParam(limit, 50, { max: 200 }),
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

  // ── Comentarios ────────────────────────────────────────────────────────────

  @Get(':concertId/comments')
  @ApiOperation({ summary: 'Lista de comentarios de un concierto' })
  getComments(
    @Req() req: any,
    @Param('concertId') concertId: string,
  ) {
    return this.concertsService.getComments(req.user.id, concertId);
  }

  @Post(':concertId/comments')
  @ApiOperation({ summary: 'Añadir un comentario a un concierto' })
  addComment(
    @Req() req: any,
    @Param('concertId') concertId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.concertsService.addComment(req.user.id, concertId, dto.text);
  }

  @Delete(':concertId/comments/:commentId')
  @ApiOperation({ summary: 'Eliminar un comentario propio' })
  deleteComment(
    @Req() req: any,
    @Param('concertId') concertId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.concertsService.deleteComment(req.user.id, commentId);
  }
}