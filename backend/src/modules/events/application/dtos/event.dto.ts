import { Currency } from '@modules/events/domain/value-objects/currency.vo';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventStatus } from '@modules/events/domain/value-objects/event-status.vo';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';


import { TicketTypeDto } from './ticket-type.dto';

/**
 * Location DTO for event responses
 */
export class EventLocationDto {
  @ApiPropertyOptional({
    description: 'Street address',
    example: '123 Main Street',
  })
  address?: string | null;

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

  @ApiPropertyOptional({
    description: 'Postal code',
    example: '1000',
  })
  postalCode?: string | null;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 36.8065,
  })
  latitude?: number | null;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: 10.1815,
  })
  longitude?: number | null;
}

/**
 * Organizer info for event responses
 * Excludes sensitive data (email, phone, etc.)
 */
export class EventOrganizerDto {
  @ApiProperty({
    description: 'Organizer user ID',
    example: 'usr_1234567890_abc123',
  })
  id!: string;

  @ApiProperty({
    description: 'Organizer first name',
    example: 'John',
  })
  firstName!: string;

  @ApiProperty({
    description: 'Organizer last name',
    example: 'Doe',
  })
  lastName!: string;

  @ApiPropertyOptional({
    description: 'Organizer display name',
    example: 'John D.',
  })
  displayName?: string;
}

/**
 * Detailed Event DTO for single event response
 *
 * Includes all event fields, organizer info, and full ticket types.
 * Used for event detail pages.
 */
export class EventDto {
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
    description: 'Event description',
    example: 'A three-day music festival featuring top artists.',
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
    type: EventLocationDto,
  })
  location!: EventLocationDto;

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
    type: EventOrganizerDto,
  })
  organizer!: EventOrganizerDto;

  @ApiProperty({
    description: 'Available ticket types',
    type: [TicketTypeDto],
  })
  ticketTypes!: TicketTypeDto[];

  // ============================================
  // Capacity & Sales Fields
  // ============================================

  @ApiProperty({
    description: 'Total capacity across all ticket types',
    example: 500,
  })
  totalCapacity!: number;

  @ApiProperty({
    description: 'Total tickets sold',
    example: 150,
  })
  soldTickets!: number;

  @ApiProperty({
    description: 'Available tickets remaining',
    example: 350,
  })
  availableCapacity!: number;

  @ApiProperty({
    description: 'Sales progress percentage (0-100)',
    example: 30,
  })
  salesProgress!: number;

  @ApiProperty({
    description: 'Total revenue generated',
    example: 7500.0,
  })
  revenueAmount!: number;

  @ApiProperty({
    description: 'Revenue currency',
    enum: Currency,
    example: Currency.TND,
  })
  revenueCurrency!: Currency;

  // ============================================
  // Timestamps
  // ============================================

  @ApiProperty({
    description: 'Date when event was created',
    example: '2026-01-15T10:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date when event was last updated',
    example: '2026-01-20T14:30:00Z',
  })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Date when event was published',
    example: '2026-01-20T14:30:00Z',
  })
  publishedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Date when event was cancelled',
    example: null,
  })
  cancelledAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Reason for cancellation',
    example: null,
  })
  cancellationReason?: string | null;

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

  @ApiProperty({
    description: 'Whether the event has started',
    example: false,
  })
  hasStarted!: boolean;

  @ApiProperty({
    description: 'Whether the event has ended',
    example: false,
  })
  hasEnded!: boolean;
}
