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

  private async findAttraction(artist: string) {
  const apiKey = this.config.get<string>('TICKETMASTER_API_KEY');

  const response = await firstValueFrom(
    this.http.get(
      'https://app.ticketmaster.com/discovery/v2/attractions.json',
      {
        params: {
          apikey: apiKey,
          keyword: artist,
          classificationName: 'Music',
          size: 10,
        },
      },
    ),
  );

  return response.data._embedded?.attractions ?? [];
}

  async getRecommendations(dto: RecommendationsDto) {
    const attractions = await this.findAttraction('Ghost');

  console.log(JSON.stringify(attractions, null, 2));

  return [];
    // const { artists, countryCode } = dto;

    // const apiKey = this.config.get<string>('TICKETMASTER_API_KEY');

    // const url = 'https://app.ticketmaster.com/discovery/v2/events.json';

    // const responses: any[] = [];

    // console.log('Artistas recibidos:', artists);

    // const uniqueArtists = [...new Set(artists)];

    // for (const artist of uniqueArtists) {
    //   console.log('Buscando:', artist);
    //   try {
    //     console.log(`🔍 Buscando ${artist}`);

    //     const response = await firstValueFrom(
    //       this.http.get(url, {
    //         params: {
    //           apikey: apiKey,
    //           keyword: artist,
    //           classificationName: 'Music',
    //           sort: 'date,asc',
    //           size: 20,
    //           ...(countryCode?.trim() ? { countryCode } : {}),
    //         },
    //       }),
    //     );

    //     responses.push(response.data);

    //     console.log(JSON.stringify(response.data, null, 2));
    //   } catch (error: any) {
    //     console.error(
    //       `❌ Error buscando ${artist}:`,
    //       error.response?.status ?? error.message,
    //     );
    //   }
    // }

    // const events = responses.flatMap(
    //   (response) => response._embedded?.events ?? [],
    // );

    // return events.map((event: any) => ({
    //   id: event.id,
    //   artist: event.name,
    //   venue: event._embedded?.venues?.[0]?.name ?? '',
    //   city: event._embedded?.venues?.[0]?.city?.name ?? '',
    //   country: event._embedded?.venues?.[0]?.country?.name ?? '',
    //   date: event.dates?.start?.localDate,
    //   imageUrl: event.images?.[0]?.url ?? '',
    //   ticketUrl: event.url,
    // }));
  }
}
