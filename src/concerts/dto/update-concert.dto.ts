import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, IsUrl, Max, Min, ValidateIf } from 'class-validator';
import { CreateConcertDto } from './create-concert.dto';

export class UpdateConcertDto extends PartialType(CreateConcertDto) {
  // Permite '' para poder borrar la foto al editar: @IsUrl por sí solo
  // rechaza la cadena vacía, y @IsOptional de class-validator solo exime
  // de validación los valores null/undefined, no ''.
  @IsOptional()
  @ValidateIf((o) => o.imageUrl !== '')
  @IsUrl({ require_tld: true }, { message: 'imageUrl debe ser una URL válida' })
  override imageUrl?: string;

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
