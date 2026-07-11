import { IsArray, IsOptional, IsString } from 'class-validator';

export class RecommendationsDto {
  @IsArray()
  @IsString({ each: true })
  artists!: string[];

  @IsOptional()
  @IsString()
  countryCode?: string;
}