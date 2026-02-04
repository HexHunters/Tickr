import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
  MinLength,
  IsNumber,
  IsLatitude,
  IsLongitude,
  ValidateNested,
} from 'class-validator';

/**
 * Location data for event update
 */
export class UpdateEventLocationDto {
  @ApiPropertyOptional({
    description: 'Street address',
    example: '123 Main Street',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiProperty({
    description: 'City name',
    example: 'Tunis',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiProperty({
    description: 'Country name',
    example: 'Tunisia',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  country!: string;

  @ApiPropertyOptional({
    description: 'Postal code',
    example: '1000',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string | null;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 36.8065,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @IsLatitude()
  latitude?: number | null;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: 10.1815,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  longitude?: number | null;
}

/**
 * DTO for updating an existing event
 *
 * All fields are optional - only provided fields will be updated.
 *
 * Business Rules:
 * - DRAFT events: all fields can be updated
 * - PUBLISHED events: only title, description, category
 * - CANCELLED/COMPLETED: no updates allowed
 */
export class UpdateEventDto {
  @ApiPropertyOptional({
    description: 'Updated event title',
    example: 'Summer Music Festival 2026 - Extended Edition',
    minLength: 1,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated event description',
    example: 'Now featuring additional artists and a fourth day!',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Updated event category',
    enum: EventCategory,
    example: EventCategory.FESTIVAL,
  })
  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @ApiPropertyOptional({
    description: 'Updated event location (only for DRAFT events)',
    type: UpdateEventLocationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateEventLocationDto)
  location?: UpdateEventLocationDto;

  @ApiPropertyOptional({
    description: 'Updated start date (only for DRAFT events)',
    example: '2026-07-15T18:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Updated end date (only for DRAFT events)',
    example: '2026-07-18T23:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
