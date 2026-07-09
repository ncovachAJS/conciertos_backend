import { IsOptional, IsString, IsUrl } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePhotoDto {
  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/recuerdo.jpg',
    description: 'URL de la foto (ya subida a Cloudinary)',
  })
  @IsUrl()
  imageUrl!: string;

  @ApiPropertyOptional({
    example: 'Primera fila, temazo tras temazo',
    description: 'Pie de foto opcional',
  })
  @IsOptional()
  @IsString()
  caption?: string;
}
