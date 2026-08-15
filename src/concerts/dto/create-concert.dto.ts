import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateConcertDto {
  @ApiProperty({ example: 'Metallica en Madrid' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Metallica' })
  @IsString()
  artist!: string;

  @ApiProperty({ example: '2026-09-20T20:00:00.000Z' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ example: 'Wizink Center' })
  @IsOptional()
  @IsString()
  venue?: string;

  @ApiPropertyOptional({ example: 'Madrid' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Mad Cool' })
  @IsOptional()
  @IsString()
  festival?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 5, description: 'Valoración del sonido' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  soundRating?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 5, description: 'Valoración del ambiente' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  atmosphereRating?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 5, description: 'Valoración del setlist' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  setlistRating?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 5, description: 'Valoración del precio/valor' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  valueRating?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 5, description: 'Valoración del artista' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  artistRating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  liked?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  favorite?: boolean;

  @ApiPropertyOptional({ example: 45.50, description: 'Precio de la entrada en euros' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'Rock', description: 'Género musical del concierto' })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({
    description: 'IDs de amigos a etiquetar en el concierto',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taggedFriendIds?: string[];
}