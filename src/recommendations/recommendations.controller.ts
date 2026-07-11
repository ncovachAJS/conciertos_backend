import { Controller, Get, Query } from '@nestjs/common';

import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get()
  getRecommendations(
    @Query('artist') artist: string,
  ) {
    return this.recommendationsService.getRecommendations(artist);
  }
}