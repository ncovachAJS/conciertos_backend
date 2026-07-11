import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RecommendationsDto } from './dto/recommendations.dto';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async getRecommendations(dto: RecommendationsDto,) {
    const { artists, countryCode } = dto;
    const artist = artists[0];
    const apiKey = this.config.get<string>('TICKETMASTER_API_KEY');


    const url = 'https://app.ticketmaster.com/discovery/v2/events.json';

    const response = await firstValueFrom(
      this.http.get(url, {
        params: {
          apikey: apiKey,
          keyword: artist,
          classificationName: 'Music',
          sort: 'date,asc',
          size: 20,
          ...(countryCode?.trim() ? { countryCode } : {}),
        },
      }),
    );

    return response.data;
  }
}
