export class CreateConcertDto {
  name!: string;

  artist!: string;

  date!: Date;

  festival!: string;

  venue!: string;

  description?: string;

  imageUrl?: string;

  rating?: number;

  liked?: boolean;
}