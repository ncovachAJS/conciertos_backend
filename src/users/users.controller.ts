import {
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
      properties: { avatarUrl: { type: 'string', example: 'https://...' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar actualizado.' })
  async updateAvatar(
    @Request() req,
    @Body('avatarUrl') avatarUrl: string,
  ) {
    return this.usersService.updateAvatar(req.user.id, avatarUrl);
  }
}