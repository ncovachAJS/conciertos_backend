import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { RecommendationsDto } from './dto/recommendations.dto';

// Mapa mínimo de código ISO → nombre en inglés que devuelve Bandsintown
const COUNTRY_NAMES: Record<string, string> = {
  ES: 'Spain',
  PT: 'Portugal',
  FR: 'France',
  GB: 'United Kingdom',
  DE: 'Germany',
  IT: 'Italy',
  NL: 'Netherlands',
  BE: 'Belgium',
  CH: 'Switzerland',
  AT: 'Austria',
  PL: 'Poland',
  CZ: 'Czech Republic',
  AR: 'Argentina',
  CL: 'Chile',
  UY: 'Uruguay',
  BR: 'Brazil',
  MX: 'Mexico',
  US: 'United States',
  CA: 'Canada',
  JP: 'Japan',
  AU: 'Australia',
};

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async getRecommendations(dto: RecommendationsDto) {
    const { artist, countryCode } = dto;
    const appId =
      this.config.get<string>('BANDSINTOWN_APP_ID') ?? 'conciertos_app';

    const encodedArtist = encodeURIComponent(artist.trim());

    try {
      const response = await firstValueFrom(
        this.http.get(
          `https://rest.bandsintown.com/artists/${encodedArtist}/events`,
          {
            params: { app_id: appId, date: 'upcoming' },
          },
        ),
      );

      let events: any[] = Array.isArray(response.data) ? response.data : [];

      // Filtrar por país si viene código ISO
      if (countryCode?.trim()) {
        const targetCountry = (
          COUNTRY_NAMES[countryCode.toUpperCase()] ?? countryCode
        ).toLowerCase();

        events = events.filter((e) =>
          e.venue?.country?.toLowerCase().includes(targetCountry),
        );
      }

      return events.map((event: any) => ({
        id: String(event.id ?? Math.random()),
        artist: event.lineup?.[0] ?? event.artist?.name ?? artist,
        venue: event.venue?.name ?? '',
        city: event.venue?.city ?? '',
        country: event.venue?.country ?? '',
        date: event.datetime ?? '',
        imageUrl:
          event.artist?.image_url ?? event.artist?.thumb_url ?? '',
        ticketUrl:
          event.offers?.find((o: any) => o.type === 'Tickets')?.url ??
          event.offers?.[0]?.url ??
          event.url ??
          '',
      }));
    } catch (error: any) {
      this.logger.error(
        `Bandsintown error for "${artist}": ${error?.message ?? error}`,
      );
      return [];
    }
  }
}
