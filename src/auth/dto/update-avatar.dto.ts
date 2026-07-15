import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl } from 'class-validator';

export class UpdateAvatarDto {
  @ApiProperty()
  @IsString()
  @IsUrl()
  imageUrl!: string;
}