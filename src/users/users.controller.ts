import {
  BadRequestException,
  Body,
  Controller,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me/avatar')
  @ApiOperation({ summary: 'Actualiza el avatar del usuario' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { avatarUrl: { type: 'string' } },
    },
  })
  async updateAvatar(@Request() req, @Body('avatarUrl') avatarUrl: string) {
    return this.usersService.updateAvatar(req.user.id, avatarUrl);
  }

  @Patch('me/name')
  @ApiOperation({ summary: 'Actualiza el nombre del usuario' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { name: { type: 'string', example: 'Nico' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Nombre actualizado.' })
  async updateName(@Request() req, @Body('name') name: string) {
    if (!name?.trim()) {
      throw new BadRequestException('El nombre no puede estar vacío');
    }
    return this.usersService.updateName(req.user.id, name.trim());
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Cambia la contraseña del usuario' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        currentPassword: { type: 'string' },
        newPassword: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada.' })
  async updatePassword(
    @Request() req,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Faltan campos obligatorios');
    }
    if (newPassword.length < 6) {
      throw new BadRequestException(
        'La nueva contraseña debe tener al menos 6 caracteres',
      );
    }

    const user = await this.usersService.findById(req.user.id);
    if (!user) throw new BadRequestException('Usuario no encontrado');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(req.user.id, hashed);

    return { message: 'Contraseña actualizada correctamente' };
  }
}