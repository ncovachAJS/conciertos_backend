import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { RecommendationsDto } from './dto/recommendations.dto';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async getRecommendations(dto: RecommendationsDto) {
    const { artist, countryCode } = dto;

    const apiKey = this.config.get<string>('TICKETMASTER_API_KEY');

    const response = await firstValueFrom(
      this.http.get(
        'https://app.ticketmaster.com/discovery/v2/events.json',
        {
          params: {
            apikey: apiKey,
            keyword: artist,
            classificationName: 'Music',
            sort: 'date,asc',
            size: 20,
            ...(countryCode?.trim()
              ? { countryCode }
              : {}),
          },
        },
      ),
    );

    const events = response.data._embedded?.events ?? [];

    return events.map((event: any) => ({
      id: event.id,
      artist: event.name,
      venue: event._embedded?.venues?.[0]?.name ?? '',
      city: event._embedded?.venues?.[0]?.city?.name ?? '',
      country: event._embedded?.venues?.[0]?.country?.name ?? '',
      date: event.dates?.start?.localDate,
      imageUrl: event.images?.[0]?.url ?? '',
      ticketUrl: event.url,
    }));
  }
}