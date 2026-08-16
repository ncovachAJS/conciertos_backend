import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { RecommendationsDto } from './dto/recommendations.dto';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

interface CacheEntry {
  data: any;
  expiresAt: number;
}

@Injectable()
export class RecommendationsService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    // Limpiar entradas caducadas cada 30 minutos para que el Map
    // no crezca indefinidamente en memoria.
    setInterval(() => this._evict(), CACHE_TTL_MS);
  }

  private _evict() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(key);
    }
  }

  async getRecommendations(dto: RecommendationsDto) {
    const { artists, countryCode } = dto;
    const apiKey = this.config.get<string>('TICKETMASTER_API_KEY') ?? '';

    // Procesar hasta 5 artistas en paralelo para no sobrecargar la API
    const top5 = [...new Set(artists.map((a) => a.trim()).filter(Boolean))].slice(0, 5);

    const allResults = await Promise.all(
      top5.map((artist) => this._fetchForArtist(artist, countryCode, apiKey)),
    );

    // Aplanar, deduplicar por id y ordenar por fecha
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const events of allResults) {
      for (const e of events) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          merged.push(e);
        }
      }
    }

    return merged.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }

  private async _fetchForArtist(
    artist: string,
    countryCode: string | undefined,
    apiKey: string,
  ): Promise<any[]> {
    const cacheKey = `${artist.toLowerCase()}|${countryCode ?? ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    try {
      const attractionId = await this.findAttractionId(artist, apiKey);

      const params: Record<string, any> = {
        apikey: apiKey,
        classificationName: 'Music',
        sort: 'date,asc',
        size: 5,
        ...(countryCode?.trim() ? { countryCode } : {}),
      };

      if (attractionId) {
        params.attractionId = attractionId;
      } else {
        params.keyword = artist;
      }

      const response = await firstValueFrom(
        this.http.get('https://app.ticketmaster.com/discovery/v2/events.json', { params }),
      );

      const events: any[] = response.data._embedded?.events ?? [];
      const result = events.map((event: any) => ({
        id: event.id,
        artist: event.name,
        recommendedBecause: artist,
        venue: event._embedded?.venues?.[0]?.name ?? '',
        city: event._embedded?.venues?.[0]?.city?.name ?? '',
        country: event._embedded?.venues?.[0]?.country?.name ?? '',
        date: event.dates?.start?.localDate,
        imageUrl: event.images?.[0]?.url ?? '',
        ticketUrl: event.url,
      }));

      this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
      return result;
    } catch {
      return [];
    }
  }

  private async findAttractionId(artist: string, apiKey: string): Promise<string | null> {
    const cacheKey = `attraction|${artist.toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      const response = await firstValueFrom(
        this.http.get('https://app.ticketmaster.com/discovery/v2/attractions.json', {
          params: {
            apikey: apiKey,
            keyword: artist,
            classificationName: 'Music',
            size: 5,
          },
        }),
      );

      const attractions: any[] = response.data._embedded?.attractions ?? [];
      const normalizedQuery = artist.trim().toLowerCase();
      const exact = attractions.find((a) => a.name?.toLowerCase() === normalizedQuery);
      const id = (exact ?? attractions[0])?.id ?? null;

      this.cache.set(cacheKey, { data: id, expiresAt: Date.now() + CACHE_TTL_MS });
      return id;
    } catch {
      return null;
    }
  }
}
