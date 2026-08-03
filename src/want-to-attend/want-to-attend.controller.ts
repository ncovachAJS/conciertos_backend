import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WantToAttendDto } from './want-to-attend.dto';
import { WantToAttendService } from './want-to-attend.service';

@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@ApiTags('WantToAttend')
@Controller('want-to-attend')
export class WantToAttendController {
  constructor(private readonly service: WantToAttendService) {}

  @Get()
  getAll(@Req() req: any) {
    return this.service.getAll(req.user.id);
  }

  @Post('toggle')
  toggle(@Req() req: any, @Body() dto: WantToAttendDto) {
    return this.service.toggle(req.user.id, dto);
  }
}
