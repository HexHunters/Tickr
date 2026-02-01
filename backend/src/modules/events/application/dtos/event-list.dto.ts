import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventStatus } from '@modules/events/domain/value-objects/event-status.vo';
import { Currency } from '@modules/events/domain/value-objects/currency.vo';

import { TicketTypeSummaryDto } from './ticket-type.dto';

/**
 * Simplified location for list views
 */
export class EventListLocationDto {
  @ApiProperty({
    description: 'City name',
    example: 'Tunis',
  })
  city!: string;

  @ApiProperty({
    description: 'Country name',
    example: 'Tunisia',
  })
  country!: string;
}

/**
 * Simplified organizer info for list views
 */
export class EventListOrganizerDto {
  @ApiProperty({
    description: 'Organizer user ID',
    example: 'usr_1234567890_abc123',
  })
  id!: string;

  @ApiProperty({
    description: 'Organizer display name',
    example: 'John D.',
  })
  displayName!: string;
}

/**
 * Event List DTO for list/search responses
 *
 * Includes essential event fields for list views.
 * Used for event discovery, search results, and dashboards.
 */
export class EventListDto {
  @ApiProperty({
    description: 'Unique event identifier',
    example: 'evt_1234567890_abc123',
  })
  id!: string;

  @ApiProperty({
    description: 'Event title',
    example: 'Summer Music Festival 2026',
  })
  title!: string;

  @ApiPropertyOptional({
    description: 'Event description (truncated)',
    example: 'A three-day music festival featuring...',
  })
  description?: string | null;

  @ApiProperty({
    description: 'Event category',
    enum: EventCategory,
    example: EventCategory.CONCERT,
  })
  category!: EventCategory;

  @ApiProperty({
    description: 'Event location',
    type: EventListLocationDto,
  })
  location!: EventListLocationDto;

  @ApiProperty({
    description: 'Event start date and time',
    example: '2026-07-15T18:00:00Z',
  })
  startDate!: Date;

  @ApiProperty({
    description: 'Event end date and time',
    example: '2026-07-17T23:00:00Z',
  })
  endDate!: Date;

  @ApiPropertyOptional({
    description: 'Event image URL',
    example: 'https://cdn.example.com/events/summer-festival.jpg',
  })
  imageUrl?: string | null;

  @ApiProperty({
    description: 'Event status',
    enum: EventStatus,
    example: EventStatus.PUBLISHED,
  })
  status!: EventStatus;

  @ApiProperty({
    description: 'Organizer information',
    type: EventListOrganizerDto,
  })
  organizer!: EventListOrganizerDto;

  @ApiProperty({
    description: 'Ticket summary information',
    type: TicketTypeSummaryDto,
  })
  ticketSummary!: TicketTypeSummaryDto;

  // ============================================
  // Quick Stats
  // ============================================

  @ApiProperty({
    description: 'Total capacity',
    example: 500,
  })
  totalCapacity!: number;

  @ApiProperty({
    description: 'Available tickets',
    example: 350,
  })
  availableCapacity!: number;

  @ApiProperty({
    description: 'Sales progress percentage (0-100)',
    example: 30,
  })
  salesProgress!: number;

  // ============================================
  // Computed Flags
  // ============================================

  @ApiProperty({
    description: 'Whether the event is sold out',
    example: false,
  })
  isSoldOut!: boolean;

  @ApiProperty({
    description: 'Whether tickets are currently on sale',
    example: true,
  })
  isOnSale!: boolean;

  // ============================================
  // Timestamps
  // ============================================

  @ApiProperty({
    description: 'Date when event was created',
    example: '2026-01-15T10:00:00Z',
  })
  createdAt!: Date;

  @ApiPropertyOptional({
    description: 'Date when event was published',
    example: '2026-01-20T14:30:00Z',
  })
  publishedAt?: Date | null;
}

/**
 * Paginated Event List Response
 */
export class PaginatedEventListDto {
  @ApiProperty({
    description: 'List of events',
    type: [EventListDto],
  })
  data!: EventListDto[];

  @ApiProperty({
    description: 'Total number of events matching the query',
    example: 150,
  })
  total!: number;

  @ApiProperty({
    description: 'Current page number (1-based)',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages!: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNextPage!: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPreviousPage!: boolean;
}
