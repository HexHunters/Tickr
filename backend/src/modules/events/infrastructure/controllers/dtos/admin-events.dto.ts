import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

import { EventCategory } from '../../../domain/value-objects/event-category.vo';
import { EventStatus } from '../../../domain/value-objects/event-status.vo';

/**
 * Query parameters for the back-office event list
 */
export class AdminEventsQueryDto {
  @ApiPropertyOptional({ description: 'Search in event titles' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  readonly status?: EventStatus;

  @ApiPropertyOptional({ enum: EventCategory })
  @IsOptional()
  @IsEnum(EventCategory)
  readonly category?: EventCategory;

  @ApiPropertyOptional({ description: 'Organizer user ID' })
  @IsOptional()
  @IsUUID()
  readonly organizerId?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit?: number = 20;
}
