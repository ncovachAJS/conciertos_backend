import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import SpotifyWebApi from 'spotify-web-api-node';

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(SpotifyService.name);
  private readonly spotifyApi: SpotifyWebApi;

  // Caché del token de cliente — evita pedir uno nuevo en cada llamada.
  // El token de Spotify dura 3600s; lo invalidamos 60s antes por seguridad.
  private _accessToken: string | null = null;
  private _tokenExpiresAt = 0;

  constructor(private readonly configService: ConfigService) {
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
   * Usa el endpoint /artists/{id}/top-tracks que funciona con Client Credentials.
   * La respuesta tiene el mismo shape que la API de Spotify para que el cliente
   * pueda usar SpotifyTrack.fromJson() sin cambios.
   */
  async getArtistTopTracks(artistId: string, market = 'ES') {
    if (!artistId?.trim()) return [];

    await this.authenticate();

    const result = await this.spotifyApi.getArtistTopTracks(artistId.trim(), market);

    return result.body.tracks.map((track) => ({
      id: track.id,
      name: track.name,
      duration_ms: track.duration_ms,
      preview_url: track.preview_url ?? null,
      explicit: track.explicit,
      popularity: track.popularity,
      external_urls: track.external_urls,
      album: {
        name: track.album.name,
        images: track.album.images,
      },
      artists: track.artists.map((a) => ({ id: a.id, name: a.name })),
    }));
  }
}