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
  @ApiProperty({
    example: 'Iron Maiden',
    description: 'Nombre del concierto',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

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

  @ApiProperty({
    example: 'Rock Imperium',
    description: 'Festival',
  })
  @IsString()
  @IsNotEmpty()
  festival!: string;

  @ApiProperty({
    example: 'Parque Torres',
    description: 'Lugar del concierto',
  })
  @IsString()
  @IsNotEmpty()
  venue!: string;

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
}