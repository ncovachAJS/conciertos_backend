import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DiscogsOauthService } from './discogs-oauth.service';
import { ProGuard } from './pro.guard';

class FinishDto {
  @IsString() @MaxLength(200) oauthToken: string;
  @IsString() @MaxLength(200) oauthVerifier: string;
}

@ApiTags('Discogs')
@Controller('discogs')
export class DiscogsAuthController {
  constructor(
    private readonly oauth: DiscogsOauthService,
    private readonly config: ConfigService,
  ) {}

  /** Devuelve la URL de Discogs donde el usuario autoriza la app. */
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, ProGuard)
  @Post('connect/start')
  @Throttle({ global: { ttl: 60_000, limit: 10 } })
  start(@Req() req: any) {
    const base =
      this.config.get<string>('PUBLIC_API_URL') ??
      `${req.protocol}://${req.get('host')}`;
    return this.oauth.start(req.user.id, `${base}/discogs/callback`);
  }

  /**
   * Discogs redirige aquí al navegador tras autorizar. No lleva JWT: solo
   * reenvía token y verifier a la app mediante su esquema de URL.
   */
  @Get('callback')
  callback(
    @Res() res: any,
    @Query('oauth_token') token?: string,
    @Query('oauth_verifier') verifier?: string,
  ) {
    const q = new URLSearchParams();
    if (token && verifier) {
      q.set('oauth_token', token);
      q.set('oauth_verifier', verifier);
    } else {
      q.set('error', 'denied');
    }
    return res.redirect(302, `lavdapp://discogs?${q.toString()}`);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, ProGuard)
  @Post('connect/finish')
  @Throttle({ global: { ttl: 60_000, limit: 10 } })
  finish(@Req() req: any, @Body() dto: FinishDto) {
    if (!dto.oauthToken || !dto.oauthVerifier) {
      throw new BadRequestException('Faltan parámetros');
    }
    return this.oauth.finish(req.user.id, dto.oauthToken, dto.oauthVerifier);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, ProGuard)
  @Get('status')
  status(@Req() req: any) {
    return this.oauth.status(req.user.id);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, ProGuard)
  @Post('import')
  @Throttle({ global: { ttl: 60_000, limit: 3 } })
  import(@Req() req: any) {
    return this.oauth.importAll(req.user.id);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, ProGuard)
  @Delete('connection')
  disconnect(@Req() req: any) {
    return this.oauth.disconnect(req.user.id);
  }
}
