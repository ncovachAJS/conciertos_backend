import { IsArray, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePhotoDto {
  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/recuerdo.jpg',
  })
  @IsUrl()
  imageUrl!: string;

  @ApiPropertyOptional({ example: 'Primera fila, temazo tras temazo' })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({ type: [String], description: 'IDs de amigos a etiquetar' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taggedFriendIds?: string[];
}