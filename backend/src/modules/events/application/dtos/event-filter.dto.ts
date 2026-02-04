import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventStatus } from '@modules/events/domain/value-objects/event-status.vo';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

/**
 * DTO for event filtering parameters
 *
 * Used in query endpoints for filtering published events.
 * All fields are optional - undefined fields are ignored.
 */
export class EventFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by event category',
    enum: EventCategory,
    example: EventCategory.CONCERT,
  })
  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @ApiPropertyOptional({
    description: 'Filter by city (case-insensitive)',
    example: 'Tunis',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'Filter by country (case-insensitive)',
    example: 'Tunisia',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    description: 'Filter events starting from this date (ISO 8601)',
    example: '2026-07-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter events starting until this date (ISO 8601)',
    example: '2026-08-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum ticket price',
    example: 50,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum ticket price',
    example: 200,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;
}

/**
 * DTO for organizer event filtering
 *
 * Used for "My Events" dashboard filtering.
 */
export class OrganizerEventFilterDto extends EventFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by event status',
    enum: EventStatus,
    example: EventStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}

/**
 * DTO for pagination parameters
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'startDate',
    enum: ['createdAt', 'updatedAt', 'startDate', 'endDate', 'title', 'totalCapacity', 'soldTickets', 'publishedAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort direction',
    example: 'ASC',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

/**
 * DTO for search parameters
 */
export class SearchDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search term for title and description',
    example: 'music festival',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
