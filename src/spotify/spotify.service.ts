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
   * Usa el Search API (/v1/search?type=track) porque Spotify restringió
   * el endpoint /artists/{id}/top-tracks a OAuth de usuario (devuelve 403
   * con Client Credentials desde 2024). El Search API sigue funcionando
   * con Client Credentials.
   */
  async getArtistTopTracks(artistId: string, artistName: string, market = 'ES') {
    const id   = artistId?.trim()   ?? '';
    const name = artistName?.trim() ?? '';

    if (!id && !name) return [];

    try {
      await this.authenticate();

      // Usar el filtro de campo "artist:" para buscar por artista, no por título.
      // Probamos primero con el mercado solicitado; si da 0 resultados útiles,
      // repetimos sin restricción de mercado (bands latinoamericanas, etc.).
      const q = name ? `artist:"${name}"` : id;

      const fetchItems = async (params: Record<string, string>) => {
        const { data } = await firstValueFrom(
          this.http.get<{ tracks: { items: any[] } }>(
            'https://api.spotify.com/v1/search',
            {
              params: { q, type: 'track', limit: '50', ...params },
              headers: { Authorization: `Bearer ${this._accessToken}` },
            },
          ),
        );
        return (data?.tracks?.items ?? []) as any[];
      };

      let items = await fetchItems({ market });

      // Si el mercado específico no tiene resultados, volvemos a intentar sin él
      if (items.length === 0) {
        this.logger.debug(`getArtistTopTracks: sin resultados en market=${market}, reintentando sin mercado`);
        items = await fetchItems({});
      }

      // 1️⃣ Filtro exacto por ID de artista
      let filtered = id
        ? items.filter((t) => (t.artists ?? []).some((a: any) => a.id === id))
        : [];

      // 2️⃣ Fallback: coincidencia por nombre de artista (case-insensitive)
      if (filtered.length === 0 && name) {
        const nameLower = name.toLowerCase();
        filtered = items.filter((t) =>
          (t.artists ?? []).some(
            (a: any) =>
              (a.name as string | undefined)?.toLowerCase().includes(nameLower) ||
              nameLower.includes((a.name as string | undefined)?.toLowerCase() ?? '__'),
          ),
        );
      }

      // 3️⃣ Último recurso: devolver lo que Spotify dio ordenado por popularidad
      if (filtered.length === 0) {
        filtered = items;
      }

      const top10 = filtered
        .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
        .slice(0, 10);

      this.logger.debug(
        `getArtistTopTracks("${name || id}") → ${items.length} totales, ${filtered.length} del artista, devolviendo ${top10.length}`,
      );

      return top10.map((track) => ({
        id: track.id,
        name: track.name,
        duration_ms: track.duration_ms,
        preview_url: track.preview_url ?? null,
        explicit: track.explicit,
        popularity: track.popularity,
        external_urls: track.external_urls,
        album: {
          name: track.album?.name ?? '',
          images: track.album?.images ?? [],
        },
        artists: (track.artists ?? []).map((a: any) => ({ id: a.id, name: a.name })),
      }));
    } catch (err: any) {
      this.logger.error(
        `getArtistTopTracks("${id}", "${market}") falló: ${err?.message ?? err}`,
      );
      return [];
    }
  }
}