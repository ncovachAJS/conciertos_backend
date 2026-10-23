import {
  Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

class SaveTokenDto {
  @IsString() token!: string;
  @IsIn(['android', 'ios']) platform!: 'android' | 'ios';
  /** Versión legible (1.4.1) y número de build (23) de la app instalada. */
  @IsOptional() @IsString() @MaxLength(20) appVersion?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000) appBuild?: number;
}

@ApiBearerAuth('JWT')
@ApiTags('Notifications')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Todas las notificaciones del usuario' })
  getAll(@Req() req: any) {
    return this.svc.getAll(req.user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Número de notificaciones no leídas' })
  getUnreadCount(@Req() req: any) {
    return this.svc.getUnreadCount(req.user.id);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  @ApiParam({ name: 'id' })
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.svc.markRead(req.user.id, id);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Marcar todas como leídas' })
  markAllRead(@Req() req: any) {
    return this.svc.markAllRead(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una notificación' })
  deleteOne(@Req() req: any, @Param('id') id: string) {
    return this.svc.deleteOne(req.user.id, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Eliminar todas las notificaciones' })
  deleteAll(@Req() req: any) {
    return this.svc.deleteAll(req.user.id);
  }

  @Post('token')
  @ApiOperation({ summary: 'Registrar token FCM del dispositivo' })
  @ApiBody({ type: SaveTokenDto })
  saveToken(@Req() req: any, @Body() dto: SaveTokenDto) {
    return this.svc.saveToken(req.user.id, dto.token, dto.platform, {
      appVersion: dto.appVersion,
      appBuild: dto.appBuild,
    });
  }

  @Put('token/remove')
  @ApiOperation({ summary: 'Eliminar token FCM (logout)' })
  @ApiBody({ schema: { properties: { token: { type: 'string' } } } })
  removeToken(@Req() req: any, @Body('token') token: string) {
    return this.svc.removeToken(token, req.user.id);
  }
}