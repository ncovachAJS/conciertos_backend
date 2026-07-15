import {
  Body,
  Controller,
  Delete,
  Post,
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
import { UpdateAvatarDto } from 'src/auth/dto/update-avatar.dto';


@ApiBearerAuth('JWT')
@ApiTags('Users')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('avatar')
  @ApiOperation({ summary: 'Actualiza el avatar del usuario' })
  @ApiBody({ type: UpdateAvatarDto })
  @ApiResponse({ status: 200, description: 'Avatar actualizado correctamente.' })
  updateAvatar(
    @Request() req,
    @Body() dto: UpdateAvatarDto,
  ) {
    return this.usersService.updateAvatar(
      req.user.id,
      dto.imageUrl,
    );
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'Elimina el avatar del usuario' })
  @ApiResponse({ status: 200, description: 'Avatar eliminado correctamente.' })
  removeAvatar(@Request() req) {
    return this.usersService.removeAvatar(req.user.id);
  }
}