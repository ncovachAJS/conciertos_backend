import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { DiscogsService } from './discogs.service';

const BASE = 'https://api.discogs.com';
const PENDING_TTL_MS = 10 * 60 * 1000;
const MAX_PAGES = 50; // 5.000 discos por lista como tope de seguridad

interface PendingRequest {
  userId: string;
  tokenSecret: string;
  expires: number;
}

export interface ImportResult {
  collection: number;
  wishlist: number;
  skipped: number;
}

/**
 * Vincula la cuenta de Discogs de cada usuario con OAuth 1.0a y permite
 * importar su colección y su lista de deseos. Discogs acepta firma PLAINTEXT
 * sobre HTTPS, así que no hace falta HMAC-SHA1.
 */
@Injectable()
export class DiscogsOauthService {
  private readonly logger = new Logger(DiscogsOauthService.name);
  // Request tokens pendientes entre /start y /finish (viven pocos minutos)
  private readonly pending = new Map<string, PendingRequest>();

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly prisma: PrismaService,
    private readonly discogs: DiscogsService,
  ) {}

  // ── Flujo OAuth ────────────────────────────────────────────────────────

  /** Paso 1: pide un request token y devuelve la URL donde el usuario autoriza. */
  async start(userId: string, callbackUrl: string) {
    const res = await this.oauthPost('/oauth/request_token', {
      oauth_callback: callbackUrl,
    });
    const token = res.get('oauth_token');
    const tokenSecret = res.get('oauth_token_secret');
    if (!token || !tokenSecret) {
      throw new BadGatewayException('Respuesta inválida de Discogs');
    }
    this.purgeExpired();
    this.pending.set(token, {
      userId,
      tokenSecret,
      expires: Date.now() + PENDING_TTL_MS,
    });
    return {
      authorizeUrl: `https://www.discogs.com/oauth/authorize?oauth_token=${encodeURIComponent(token)}`,
    };
  }

  /** Paso 2: canjea el verifier por el access token y guarda la conexión. */
  async finish(userId: string, oauthToken: string, verifier: string) {
    const entry = this.pending.get(oauthToken);
    if (!entry || entry.userId !== userId || entry.expires < Date.now()) {
      throw new BadRequestException(
        'La autorización ha caducado, vuelve a intentarlo',
      );
    }
    this.pending.delete(oauthToken);

    const res = await this.oauthPost(
      '/oauth/access_token',
      { oauth_token: oauthToken, oauth_verifier: verifier },
      entry.tokenSecret,
    );
    const accessToken = res.get('oauth_token');
    const accessSecret = res.get('oauth_token_secret');
    if (!accessToken || !accessSecret) {
      throw new BadGatewayException('Respuesta inválida de Discogs');
    }

    const identity = await this.signedGet('/oauth/identity', accessToken, accessSecret);
    const username: string = identity?.username;
    if (!username) throw new BadGatewayException('No se pudo leer tu usuario');

    const data = {
      username,
      accessToken: this.encrypt(accessToken),
      accessSecret: this.encrypt(accessSecret),
    };
    await this.prisma.discogsConnection.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return { username };
  }

  async status(userId: string) {
    const c = await this.prisma.discogsConnection.findUnique({
      where: { userId },
      select: { username: true },
    });
    return { connected: !!c, username: c?.username ?? null };
  }

  async disconnect(userId: string) {
    await this.prisma.discogsConnection.deleteMany({ where: { userId } });
    return { disconnected: true };
  }

  // ── Importación ────────────────────────────────────────────────────────

  /** Importa colección y lista de deseos. No sobrescribe discos ya existentes. */
  async importAll(userId: string): Promise<ImportResult> {
    const conn = await this.prisma.discogsConnection.findUnique({
      where: { userId },
    });
    if (!conn) throw new NotFoundException('Discogs no está vinculado');
    const token = this.decrypt(conn.accessToken);
    const secret = this.decrypt(conn.accessSecret);
    const user = encodeURIComponent(conn.username);

    const owned = await this.fetchAll(
      `/users/${user}/collection/folders/0/releases`,
      'releases',
      token,
      secret,
    );
    const wants = await this.fetchAll(
      `/users/${user}/wants`,
      'wants',
      token,
      secret,
    );

    const toRow = (item: any, status: 'OWNED' | 'WISHLIST') => {
      const b = item.basic_information ?? {};
      return {
        userId,
        status,
        discogsId: b.id as number,
        title: String(b.title ?? ''),
        artist: this.discogs.joinArtists(b.artists),
        year: b.year ? Number(b.year) : null,
        label: b.labels?.[0]?.name ?? null,
        format: this.discogs.mapFormat(
          (b.formats ?? []).map((f: any) => f.name),
        ),
        coverUrl: b.cover_image || b.thumb || null,
        rating: status === 'OWNED' ? Math.min(5, Math.max(0, item.rating ?? 0)) : 0,
      };
    };

    // La colección va primero: si un disco está en ambas listas manda "OWNED"
    const rows = [
      ...owned.map((i) => toRow(i, 'OWNED')),
      ...wants.map((i) => toRow(i, 'WISHLIST')),
    ].filter((r) => r.discogsId);

    // Deduplica y descarta lo que el usuario ya tiene (no se sobrescribe nada)
    const existing = await this.prisma.record.findMany({
      where: { userId, discogsId: { not: null } },
      select: { discogsId: true },
    });
    const seen = new Set<number>(existing.map((r) => r.discogsId as number));
    const fresh = rows.filter((r) => !seen.has(r.discogsId) && seen.add(r.discogsId));

    await this.prisma.record.createMany({ data: fresh, skipDuplicates: true });
    return {
      collection: fresh.filter((r) => r.status === 'OWNED').length,
      wishlist: fresh.filter((r) => r.status === 'WISHLIST').length,
      skipped: rows.length - fresh.length,
    };
  }

  private async fetchAll(
    path: string,
    key: 'releases' | 'wants',
    token: string,
    secret: string,
  ): Promise<any[]> {
    const items: any[] = [];
    let page = 1;
    let pages = 1;
    do {
      const data = await this.signedGet(
        `${path}?per_page=100&page=${page}`,
        token,
        secret,
      );
      items.push(...(data?.[key] ?? []));
      pages = data?.pagination?.pages ?? 1;
      page++;
    } while (page <= pages && page <= MAX_PAGES);
    return items;
  }

  // ── Firma y peticiones OAuth ───────────────────────────────────────────

  private consumer() {
    const key = this.config.get<string>('DISCOGS_KEY');
    const secret = this.config.get<string>('DISCOGS_SECRET');
    if (!key || !secret) {
      throw new BadGatewayException('Discogs OAuth no está configurado');
    }
    return { key, secret };
  }

  private authHeader(extra: Record<string, string>, tokenSecret = '') {
    const { key, secret } = this.consumer();
    const params: Record<string, string> = {
      oauth_consumer_key: key,
      oauth_nonce: randomBytes(12).toString('hex'),
      oauth_signature: `${secret}&${tokenSecret}`,
      oauth_signature_method: 'PLAINTEXT',
      oauth_timestamp: String(Math.floor(Date.now() / 1000)),
      ...extra,
    };
    return (
      'OAuth ' +
      Object.entries(params)
        .map(([k, v]) =>
          k === 'oauth_signature' ? `${k}="${v}"` : `${k}="${encodeURIComponent(v)}"`,
        )
        .join(', ')
    );
  }

  private async oauthPost(
    path: string,
    extra: Record<string, string>,
    tokenSecret = '',
  ) {
    try {
      const res = await firstValueFrom(
        this.http.post(`${BASE}${path}`, null, {
          headers: {
            Authorization: this.authHeader(extra, tokenSecret),
            'User-Agent': 'LaVidaEnDirecto/1.0',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10_000,
        }),
      );
      return new URLSearchParams(String(res.data));
    } catch (err: any) {
      this.logger.error(`Discogs ${path} → ${err?.response?.status ?? err?.message}`);
      throw new BadGatewayException('Error al conectar con Discogs');
    }
  }

  private async signedGet(path: string, token: string, tokenSecret: string) {
    try {
      const res = await firstValueFrom(
        this.http.get(`${BASE}${path}`, {
          headers: {
            Authorization: this.authHeader({ oauth_token: token }, tokenSecret),
            'User-Agent': 'LaVidaEnDirecto/1.0',
            Accept: 'application/json',
          },
          timeout: 15_000,
        }),
      );
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      this.logger.error(`Discogs ${path} → ${status ?? err?.message}`);
      if (status === 401) {
        throw new BadRequestException(
          'Discogs rechazó la conexión, vuelve a vincular tu cuenta',
        );
      }
      throw new BadGatewayException(
        status === 429
          ? 'Discogs limitó las peticiones, inténtalo en un minuto'
          : 'Error al consultar Discogs',
      );
    }
  }

  private purgeExpired() {
    const now = Date.now();
    for (const [k, v] of this.pending) if (v.expires < now) this.pending.delete(k);
  }

  // ── Cifrado de tokens en BBDD ──────────────────────────────────────────

  private cryptoKey() {
    const secret =
      this.config.get<string>('DISCOGS_TOKEN_ENC_KEY') ??
      this.config.get<string>('JWT_SECRET') ??
      '';
    return createHash('sha256').update(secret).digest();
  }

  private encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.cryptoKey(), iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
  }

  private decrypt(payload: string): string {
    const [iv, tag, enc] = payload.split('.').map((p) => Buffer.from(p, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', this.cryptoKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }
}
