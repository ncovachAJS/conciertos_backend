import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const RECORD_FORMATS = ['VINYL', 'CD', 'OTHER'] as const;
export type RecordFormat = (typeof RECORD_FORMATS)[number];

export const RECORD_STATUSES = ['OWNED', 'WISHLIST'] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

// Escala Goldmine: Mint, Near Mint, Very Good Plus, Very Good, Good, Poor
export const RECORD_CONDITIONS = ['M', 'NM', 'VG+', 'VG', 'G', 'P'] as const;

export class CreateRecordDto {
  @IsString() @MaxLength(300) title: string;
  @IsString() @MaxLength(300) artist: string;

  @IsOptional() @IsIn(RECORD_FORMATS) format?: RecordFormat;
  @IsOptional() @IsIn(RECORD_STATUSES) status?: RecordStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @IsOptional() @IsString() @MaxLength(200) label?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsUrl() coverUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  discogsId?: number;

  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsIn(RECORD_CONDITIONS) condition?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5)
  rating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100000)
  price?: number;
}

export class UpdateRecordDto {
  @IsOptional() @IsString() @MaxLength(300) title?: string;
  @IsOptional() @IsString() @MaxLength(300) artist?: string;
  @IsOptional() @IsIn(RECORD_FORMATS) format?: RecordFormat;
  @IsOptional() @IsIn(RECORD_STATUSES) status?: RecordStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @IsOptional() @IsString() @MaxLength(200) label?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsIn(RECORD_CONDITIONS) condition?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5)
  rating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100000)
  price?: number;
}
