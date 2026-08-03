import { IsString } from 'class-validator';

export class WantToAttendDto {
  @IsString() eventId: string;
  @IsString() artist: string;
  @IsString() venue: string;
  @IsString() city: string;
  @IsString() country: string;
  @IsString() date: string;
  @IsString() imageUrl: string;
  @IsString() ticketUrl: string;
}
