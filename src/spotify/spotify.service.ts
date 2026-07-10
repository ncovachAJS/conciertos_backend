import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import SpotifyWebApi from 'spotify-web-api-node';

@Injectable()
export class SpotifyService {
  private spotifyApi: SpotifyWebApi;

  constructor(private configService: ConfigService) {
    this.spotifyApi = new SpotifyWebApi({
      clientId: this.configService.get<string>('SPOTIFY_CLIENT_ID'),
      clientSecret: this.configService.get<string>('SPOTIFY_CLIENT_SECRET'),
    });
  }

  private async authenticate() {
    const data = await this.spotifyApi.clientCredentialsGrant();

    this.spotifyApi.setAccessToken(data.body.access_token);
  }

  async searchArtist(name: string) {
    await this.authenticate();

    const result = await this.spotifyApi.searchArtists(name, {
      limit: 1,
    });

    if (result.body.artists.items.length === 0) {
      return null;
    }

    const artist = result.body.artists.items[0];
console.log(JSON.stringify(artist, null, 2));
    return {
      id: artist.id,
      name: artist.name,
      url: artist.external_urls.spotify,
      image: artist.images?.isNotEmpty == true
    ? artist.images.first.url
    : null,
      followers: artist.followers?.total ?? 0,
      genres: artist.genres,
    };
  }
}