import { Controller, Get, Query } from '@nestjs/common';
import { SpotifyService } from './spotify.service';

@Controller('spotify')
export class SpotifyController {
  constructor(private readonly spotifyService: SpotifyService) {}

  @Get('artist')
  async artist(@Query('name') name: string) {
    return await this.spotifyService.searchArtist(name);
  }
}