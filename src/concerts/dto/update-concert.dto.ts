import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { CreateConcertDto } from './create-concert.dto';

export class UpdateConcertDto extends PartialType(CreateConcertDto) {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  override soundRating?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  override atmosphereRating?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  override setlistRating?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  override valueRating?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  override artistRating?: number;
}
