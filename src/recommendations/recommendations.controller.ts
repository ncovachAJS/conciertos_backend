import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecommendationsDto } from './dto/recommendations.dto';
import { RecommendationsService } from './recommendations.service';

@ApiBearerAuth('JWT')
@ApiTags('Recommendations')
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  getRecommendations(@Body() dto: RecommendationsDto) {
    return this.recommendationsService.getRecommendations(dto);
  }
}
