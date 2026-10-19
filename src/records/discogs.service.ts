import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export type DiscogsFormat = 'VINYL' | 'CD' | 'OTHER';

export interface DiscogsRelease {
  discogsId: number;
  artist: string;
  title: string;
  year: number | null;
  label: string | null;
  country: string | null;
  format: DiscogsFormat;
  coverUrl: string | null;
}

export interface DiscogsTrack {
  position: string;
  title: string;
  duration: string;
}

export interface DiscogsReleaseDetail extends DiscogsRelease {
  tracklist: DiscogsTrack[];
  genres: string[];
  styles: string[];
  discogsUrl: string | null;
}

export interface DiscogsSearchResult {
  page: number;
  pages: number;
  items: DiscogsRelease[];
}

@Injectable()
export class DiscogsService {
  private readonly logger = new Logger(DiscogsService.name);
  private readonly baseUrl = 'https://api.discogs.com';

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  private headers() {
    // Dos formas de autenticarse (ambas dan 60 req/min y acceso a imágenes):
    //  - DISCOGS_TOKEN: token personal
    //  - DISCOGS_KEY + DISCOGS_SECRET: credenciales de la aplicación
    const token = this.config.get<string>('DISCOGS_TOKEN');
    const key = this.config.get<string>('DISCOGS_KEY');
    const secret = this.config.get<string>('DISCOGS_SECRET');
    const authorization = token
      ? `Discogs token=${token}`
      : key && secret
        ? `Discogs key=${key}, secret=${secret}`
        : undefined;
    return {
      Accept: 'application/json',
      // Discogs rechaza peticiones sin User-Agent identificable
      'User-Agent': 'LaVidaEnDirecto/1.0',
      ...(authorization ? { Authorization: authorization } : {}),
    };
  }

  /** Busca releases por texto libre o por código de barras. */
  async search(params: {
    q?: string;
    barcode?: string;
    format?: 'VINYL' | 'CD';
    page?: number;
  }): Promise<DiscogsSearchResult> {
    const query: Record<string, string> = {
      type: 'release',
      per_page: '20',
      page: String(params.page ?? 1),
    };
    if (params.q) query.q = params.q;
    if (params.barcode) query.barcode = params.barcode;
    if (params.format === 'VINYL') query.format = 'Vinyl';
    if (params.format === 'CD') query.format = 'CD';

    const data = await this.get('/database/search', query);

    return {
      page: data?.pagination?.page ?? 1,
      pages: data?.pagination?.pages ?? 1,
      items: (data?.results ?? []).map((r: any) => this.fromSearch(r)),
    };
  }

  async getRelease(id: number): Promise<DiscogsReleaseDetail> {
    const r = await this.get(`/releases/${id}`);
    return {
      tracklist: (r.tracklist ?? [])
        .filter((t: any) => t.type_ === 'track')
        .map((t: any) => ({
          position: t.position ?? '',
          title: t.title ?? '',
          duration: t.duration ?? '',
        })),
      genres: r.genres ?? [],
      styles: r.styles ?? [],
      discogsUrl: r.uri ?? null,
      discogsId: r.id,
      artist: this.joinArtists(r.artists),
      title: r.title,
      year: r.year || null,
      label: r.labels?.[0]?.name ?? null,
      country: r.country ?? null,
      format: this.mapFormat((r.formats ?? []).map((f: any) => f.name)),
      coverUrl: r.images?.[0]?.uri ?? r.thumb ?? null,
    };
  }

  private async get(path: string, query?: Record<string, string>) {
    const qs = query ? `?${new URLSearchParams(query).toString()}` : '';
    try {
      const res = await firstValueFrom(
        this.http.get(`${this.baseUrl}${path}${qs}`, {
          headers: this.headers(),
          timeout: 10_000,
        }),
      );
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      this.logger.error(`Discogs ${path} → ${status ?? err?.message}`);
      const error: any = new Error(`Discogs ${status ?? 'error'}`);
      error.status = status;
      throw error;
    }
  }

  // El título de los resultados de búsqueda viene como "Artista - Título"
  private fromSearch(r: any): DiscogsRelease {
    const full: string = r.title ?? '';
    const sep = full.indexOf(' - ');
    return {
      discogsId: r.id,
      // Discogs añade "(2)" para desambiguar artistas homónimos
      artist: sep > 0 ? full.slice(0, sep).replace(/\s\(\d+\)$/, '') : '',
      title: sep > 0 ? full.slice(sep + 3) : full,
      year: r.year ? parseInt(r.year, 10) || null : null,
      label: r.label?.[0] ?? null,
      country: r.country ?? null,
      format: this.mapFormat(r.format ?? []),
      coverUrl: r.cover_image || r.thumb || null,
    };
  }

  mapFormat(formats: string[]): DiscogsFormat {
    const f = formats.map((x) => x.toLowerCase());
    if (f.includes('vinyl') || f.includes('lp')) return 'VINYL';
    if (f.includes('cd')) return 'CD';
    return 'OTHER';
  }

  joinArtists(artists: any[] | undefined): string {
    // Discogs añade "(2)" para desambiguar artistas homónimos
    return (artists ?? [])
      .map((a) => String(a.name).replace(/\s\(\d+\)$/, ''))
      .join(', ');
  }
}
