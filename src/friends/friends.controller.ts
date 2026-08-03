import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FriendsService } from './friends.service';

@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@ApiTags('Friends')
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista de amigos aceptados' })
  getFriends(@Req() req: any) {
    return this.friendsService.getFriends(req.user.id);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Solicitudes de amistad pendientes recibidas' })
  getPending(@Req() req: any) {
    return this.friendsService.getPendingRequests(req.user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar usuarios por nombre o email' })
  @ApiQuery({ name: 'q', required: true })
  search(@Req() req: any, @Query('q') q: string) {
    return this.friendsService.searchUsers(req.user.id, q);
  }

  @Get(':friendId/upcoming-concerts')
  @ApiOperation({ summary: 'Próximos conciertos propios de un amigo' })
  getFriendUpcomingConcerts(@Req() req: any, @Param('friendId') friendId: string) {
    return this.friendsService.getFriendUpcomingConcerts(req.user.id, friendId);
  }

  @Post('request/:receiverId')
  @ApiOperation({ summary: 'Enviar solicitud de amistad' })
  sendRequest(@Req() req: any, @Param('receiverId') receiverId: string) {
    return this.friendsService.sendRequest(req.user.id, receiverId);
  }

  @Post('accept/:friendshipId')
  @ApiOperation({ summary: 'Aceptar solicitud de amistad' })
  acceptRequest(@Req() req: any, @Param('friendshipId') friendshipId: string) {
    return this.friendsService.acceptRequest(req.user.id, friendshipId);
  }

  @Delete(':friendshipId')
  @ApiOperation({ summary: 'Rechazar o cancelar amistad' })
  remove(@Req() req: any, @Param('friendshipId') friendshipId: string) {
    return this.friendsService.removeRequest(req.user.id, friendshipId);
  }
}