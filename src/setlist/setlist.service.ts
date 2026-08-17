import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SetlistService {
  private readonly logger = new Logger(SetlistService.name);
  private readonly baseUrl = 'https://api.setlist.fm/rest/1.0';

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  async searchSetlist(params: {
    artistName: string;
    date: string; // dd-MM-yyyy
    p?: number;
  }) {
    const apiKey = this.config.get<string>('SETLIST_API_KEY') ?? '';

    const query = new URLSearchParams({
      artistName: params.artistName,
      date: params.date,
      p: String(params.p ?? 1),
    });

    const url = `${this.baseUrl}/search/setlists?${query.toString()}`;

    try {
      const response = await firstValueFrom(
        this.http.get(url, {
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'es',
            'x-api-key': apiKey,
          },
        }),
      );

      return response.data;
    } catch (err: any) {
      const status = err?.response?.status;
      const body = err?.response?.data;
      this.logger.error(
        `searchSetlist("${params.artistName}", "${params.date}") → ${status}: ${JSON.stringify(body)}`,
      );
      // Propagamos el error con el status original de setlist.fm si lo hay
      if (status) {
        const error: any = new Error(`setlist.fm ${status}`);
        error.status = status;
        error.data = body;
        throw error;
      }
      throw err;
    }
  }
}
