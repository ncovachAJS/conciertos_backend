import { IsArray, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class RecommendationsDto {
  @IsArray()
  @IsString({ each: true })
  artists!: string[];

  @IsOptional()
  @IsString()
  countryCode?: string;

  /** Latitud del usuario (búsqueda "cerca de ti") */
  @IsOptional()
  @IsNumber()
  lat?: number;

  /** Longitud del usuario (búsqueda "cerca de ti") */
  @IsOptional()
  @IsNumber()
  lng?: number;

  /** Radio en km (por defecto 50, máximo 500) */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  radius?: number;
}
