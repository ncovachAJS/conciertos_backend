import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { BroadcastDto, BroadcastPreviewQuery, ListUsersQuery, SetProDto } from './admin.dto';
import { AdminService } from './admin.service';

@ApiBearerAuth('JWT')
@ApiTags('Admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de uso de la app' })
  getStats() {
    return this.service.getStats();
  }

  @Get('versions')
  @ApiOperation({ summary: 'Dispositivos por versión de la app instalada' })
  getVersions() {
    return this.service.getVersions();
  }

  @Get('broadcast/preview')
  @ApiOperation({ summary: 'A cuántos usuarios llegaría un aviso (no envía nada)' })
  previewBroadcast(@Query() q: BroadcastPreviewQuery) {
    return this.service.previewBroadcast(q.audience, q.maxBuild);
  }

  @Post('broadcast')
  @Throttle({ global: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Envía un aviso (push + bandeja) a un grupo de usuarios' })
  broadcast(@Req() req: any, @Body() dto: BroadcastDto) {
    return this.service.broadcast(req.user.id, dto);
  }

  @Get('users')
  @ApiOperation({ summary: 'Lista/busca usuarios' })
  listUsers(@Query() query: ListUsersQuery) {
    return this.service.listUsers(query.q, query.skip, query.take);
  }

  @Patch('users/:id/pro')
  @ApiOperation({ summary: 'Activa o quita el plan Pro a un usuario' })
  setPro(@Req() req: any, @Param('id') id: string, @Body() dto: SetProDto) {
    return this.service.setPro(req.user.id, id, dto.isPro);
  }
}
