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
    artistName?: string;
    tourName?: string;
    date?: string; // dd-MM-yyyy (opcional; solo para búsqueda de concierto concreto)
    p?: number;
  }) {
    const apiKey = this.config.get<string>('SETLIST_API_KEY') ?? '';

    const queryParams: Record<string, string> = {
      p: String(params.p ?? 1),
    };
    if (params.artistName) queryParams.artistName = params.artistName;
    if (params.tourName) queryParams.tourName = params.tourName;
    if (params.date) queryParams.date = params.date;

    const query = new URLSearchParams(queryParams);
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
