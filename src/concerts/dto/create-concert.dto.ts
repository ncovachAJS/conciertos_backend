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

  @ApiPropertyOptional({
    description: 'IDs de amigos a etiquetar en el concierto',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taggedFriendIds?: string[];
}