import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { RecommendationsDto } from './dto/recommendations.dto';
import { RecommendationsService } from './recommendations.service';

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
