import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Pantallas a las que puede llevar un aviso al tocarlo. Lista cerrada: la app
 * solo abre destinos que conoce, así que un valor inventado no hace nada.
 */
export const ANNOUNCEMENT_TARGETS = [
  'store',
  'notifications',
  'friends',
  'statistics',
  'records',
] as const;
export type AnnouncementTarget = (typeof ANNOUNCEMENT_TARGETS)[number];

export class BroadcastDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  body!: string;

  /** all = todos · pro = solo Pro · free = solo gratuitos */
  @IsIn(['all', 'pro', 'free'])
  audience!: 'all' | 'pro' | 'free';

  /**
   * Solo dispositivos con build menor que este (los que no reportan versión
   * cuentan como antiguos). Sirve para avisar a quien no ha actualizado.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  maxBuild?: number;

  /** Destino al tocar la notificación (null/ausente = solo abrir la app). */
  @IsOptional()
  @IsIn(ANNOUNCEMENT_TARGETS as unknown as string[])
  target?: AnnouncementTarget;

  /** Además del push, guardar el aviso en la bandeja de notificaciones. */
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;
}

export class SetProDto {
  @IsBoolean()
  isPro!: boolean;
}

export class ListUsersQuery {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number;
}

export class BroadcastPreviewQuery {
  @IsIn(['all', 'pro', 'free'])
  audience!: 'all' | 'pro' | 'free';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxBuild?: number;
}
