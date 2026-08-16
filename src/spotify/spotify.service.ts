import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import SpotifyWebApi from 'spotify-web-api-node';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(SpotifyService.name);
  private readonly spotifyApi: SpotifyWebApi;

  // Caché del token de cliente — evita pedir uno nuevo en cada llamada.
  // El token de Spotify dura 3600s; lo invalidamos 60s antes por seguridad.
  private _accessToken: string | null = null;
  private _tokenExpiresAt = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly http: HttpService,
  ) {
    this.spotifyApi = new SpotifyWebApi({
      clientId: this.configService.get<string>('SPOTIFY_CLIENT_ID'),
      clientSecret: this.configService.get<string>('SPOTIFY_CLIENT_SECRET'),
    });
  }

  private async authenticate(): Promise<void> {
    const margin = 60_000; // 60 segundos de margen

    if (this._accessToken && Date.now() < this._tokenExpiresAt - margin) {
      return; // Token aún válido, no hace falta pedir uno nuevo
    }

    this.logger.debug('Solicitando nuevo token de Spotify');

    const data = await this.spotifyApi.clientCredentialsGrant();

    this._accessToken = data.body.access_token;
    this._tokenExpiresAt = Date.now() + data.body.expires_in * 1000;

    this.spotifyApi.setAccessToken(this._accessToken);

    this.logger.debug(
      `Token de Spotify obtenido, expira en ${data.body.expires_in}s`,
    );
  }

  async searchArtist(name: string) {
    if (!name?.trim()) return null;

    await this.authenticate();

    const result = await this.spotifyApi.searchArtists(name.trim(), {
      limit: 1,
    });

    const items = result.body.artists?.items ?? [];

    if (items.length === 0) return null;

    const artist = items[0];

    const image =
      (artist.images?.length ?? 0) > 0 ? artist.images[0].url : null;

    return {
      id: artist.id,
      name: artist.name,
      url: artist.external_urls.spotify,
      image,
      followers: artist.followers?.total ?? 0,
      genres: artist.genres ?? [],
    };
  }

  /**
   * Devuelve las canciones más populares de un artista (máx. 10).
   *
   * Estrategia:
   * 1. GET /artists/{id}/albums  → álbumes recientes del artista (Client Credentials ✓)
   * 2. GET /albums?ids=...       → detalles de los álbumes (incluye popularity de tracks)
   * 3. Ordena todos los tracks por popularity y devuelve el top 10
   *
   * Nota: /artists/{id}/top-tracks requiere OAuth de usuario desde 2024 (403 con CC).
   */
  async getArtistTopTracks(artistId: string, artistName: string, market = 'ES') {
    const id = artistId?.trim() ?? '';
    if (!id) return [];

    try {
      await this.authenticate();
      const headers = { Authorization: `Bearer ${this._accessToken}` };

      // 1. Álbumes del artista — sin include_groups para evitar encoding de coma
      const albumsRes = await firstValueFrom(
        this.http.get<{ items: any[] }>(
          `https://api.spotify.com/v1/artists/${id}/albums`,
          {
            params: { limit: 50 },
            headers,
          },
        ),
      );
      const albums: any[] = albumsRes.data?.items ?? [];
      this.logger.log(`getArtistTopTracks step1: ${albums.length} álbumes para "${artistName || id}"`);

      if (albums.length === 0) {
        this.logger.warn(`getArtistTopTracks("${id}"): sin álbumes`);
        return [];
      }

      // 2. Detalles completos de hasta 20 álbumes (incluye tracks con popularity)
      const albumIds = albums.slice(0, 20).map((a: any) => a.id).join(',');
      const detailsRes = await firstValueFrom(
        this.http.get<{ albums: any[] }>(
          'https://api.spotify.com/v1/albums',
          { params: { ids: albumIds }, headers },
        ),
      );
      const fullAlbums: any[] = detailsRes.data?.albums ?? [];
      this.logger.log(`getArtistTopTracks step2: ${fullAlbums.length} álbumes con tracks`);

      // 3. Aplanar tracks, deduplicar por nombre, ordenar por popularity
      const seen = new Set<string>();
      const allTracks: any[] = [];
      for (const album of fullAlbums) {
        for (const track of album.tracks?.items ?? []) {
          const key = track.name?.toLowerCase().trim() ?? track.id;
          if (!seen.has(key)) {
            seen.add(key);
            allTracks.push({
              ...track,
              popularity: album.popularity ?? 0,
              album: {
                name: album.name ?? '',
                images: album.images ?? [],
              },
            });
          }
        }
      }

      const top10 = allTracks
        .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
        .slice(0, 10);

      this.logger.log(
        `getArtistTopTracks step3: ${allTracks.length} tracks únicos → devolviendo ${top10.length}`,
      );

      return top10.map((track) => ({
        id: track.id,
        name: track.name,
        duration_ms: track.duration_ms,
        preview_url: track.preview_url ?? null,
        explicit: track.explicit ?? false,
        popularity: track.popularity,
        external_urls: track.external_urls ?? {},
        album: track.album,
        artists: (track.artists ?? []).map((a: any) => ({ id: a.id, name: a.name })),
      }));
    } catch (err: any) {
      this.logger.error(
        `getArtistTopTracks("${id}") falló: ${err?.message ?? err} | body: ${JSON.stringify(err?.response?.data ?? {})}`,
      );
      return [];
    }
  }
}