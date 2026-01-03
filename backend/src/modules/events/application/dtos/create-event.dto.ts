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
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';

/**
 * Location data for event creation
 */
export class CreateEventLocationDto {
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
 * DTO for creating a new event
 *
 * Uses class-validator decorators for input validation.
 * The organizerId is typically extracted from the authenticated user.
 */
export class CreateEventDto {
  @ApiProperty({
    description: 'Event title',
    example: 'Summer Music Festival 2026',
    minLength: 1,
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    description: 'Event description',
    example: 'A three-day music festival featuring top artists.',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiProperty({
    description: 'Event category',
    enum: EventCategory,
    example: EventCategory.CONCERT,
  })
  @IsNotEmpty()
  @IsEnum(EventCategory)
  category!: EventCategory;

  @ApiProperty({
    description: 'Event location',
    type: CreateEventLocationDto,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CreateEventLocationDto)
  location!: CreateEventLocationDto;

  @ApiProperty({
    description: 'Event start date and time (ISO 8601)',
    example: '2026-07-15T18:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    description: 'Event end date and time (ISO 8601)',
    example: '2026-07-17T23:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({
    description: 'Event image URL',
    example: 'https://cdn.example.com/events/summer-festival.jpg',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string | null;
}

/**
 * Response DTO for created event
 */
export class CreateEventResponseDto {
  @ApiProperty({
    description: 'Created event ID',
    example: 'evt_1234567890_abc123',
  })
  eventId!: string;
}
