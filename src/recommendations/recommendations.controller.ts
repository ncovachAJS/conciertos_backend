import { Body, Controller, Post } from '@nestjs/common';

import { RecommendationsDto } from './dto/recommendations.dto';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Post()
  getRecommendations(
    @Body() dto: RecommendationsDto,
  ) {
    return this.recommendationsService.getRecommendations(dto);
  }
}