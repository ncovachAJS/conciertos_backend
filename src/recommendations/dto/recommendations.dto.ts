import { IsOptional, IsString } from 'class-validator';

export class RecommendationsDto {
  @IsString()
  artist!: string;

  @IsOptional()
  @IsString()
  countryCode?: string;
}