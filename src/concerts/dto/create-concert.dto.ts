import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConcertDto {
  @ApiPropertyOptional({
    example: 'Iron Maiden',
    description: 'Nombre del concierto',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'Iron Maiden',
    description: 'Artista o banda',
  })
  @IsString()
  @IsNotEmpty()
  artist!: string;

  @ApiProperty({
    example: '2026-07-15',
    description: 'Fecha del concierto',
  })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({
    example: 'Rock Imperium',
    description: 'Festival',
  })
  @IsOptional()
  @IsString()
  festival?: string;

  @ApiPropertyOptional({
    example: 'Parque Torres',
    description: 'Lugar del concierto',
  })
  @IsOptional()
  @IsString()
  venue?: string;

  @ApiPropertyOptional({
    example: 'Cartagena',
    description: 'Ciudad donde se celebra el concierto',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'Concierto de la gira mundial',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://miweb.com/ironmaiden.jpg',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({
    example: 5,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  liked?: boolean;

  @ApiPropertyOptional({
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  favorite?: boolean;
}
