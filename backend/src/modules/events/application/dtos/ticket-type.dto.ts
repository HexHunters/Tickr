import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Currency } from '@modules/events/domain/value-objects/currency.vo';

/**
 * DTO for ticket type response
 *
 * Includes all ticket type fields plus calculated fields.
 * Used in EventDto for full event details.
 */
export class TicketTypeDto {
  @ApiProperty({
    description: 'Unique ticket type identifier',
    example: 'tkt_1234567890_abc123',
  })
  id!: string;

  @ApiProperty({
    description: 'Event this ticket type belongs to',
    example: 'evt_1234567890_abc123',
  })
  eventId!: string;

  @ApiProperty({
    description: 'Ticket type name',
    example: 'VIP Access',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Ticket type description',
    example: 'Includes backstage access and meet & greet',
  })
  description?: string | null;

  @ApiProperty({
    description: 'Ticket price amount',
    example: 150.0,
  })
  priceAmount!: number;

  @ApiProperty({
    description: 'Ticket price currency',
    enum: Currency,
    example: Currency.TND,
  })
  priceCurrency!: Currency;

  @ApiProperty({
    description: 'Total quantity available for sale',
    example: 100,
  })
  quantity!: number;

  @ApiProperty({
    description: 'Number of tickets sold',
    example: 45,
  })
  soldQuantity!: number;

  @ApiProperty({
    description: 'Number of tickets still available',
    example: 55,
  })
  availableQuantity!: number;

  @ApiProperty({
    description: 'Sales period start date',
    example: '2026-06-01T00:00:00Z',
  })
  salesStartDate!: Date;

  @ApiProperty({
    description: 'Sales period end date',
    example: '2026-07-14T23:59:59Z',
  })
  salesEndDate!: Date;

  @ApiProperty({
    description: 'Whether the ticket type is active',
    example: true,
  })
  isActive!: boolean;

  // ============================================
  // Calculated Fields
  // ============================================

  @ApiProperty({
    description: 'Whether all tickets are sold',
    example: false,
  })
  isSoldOut!: boolean;

  @ApiProperty({
    description: 'Whether tickets are currently on sale',
    example: true,
  })
  isOnSale!: boolean;

  @ApiProperty({
    description: 'Sales progress percentage (0-100)',
    example: 45,
  })
  salesProgress!: number;

  @ApiProperty({
    description: 'Date when ticket type was created',
    example: '2026-01-15T10:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date when ticket type was last updated',
    example: '2026-01-20T14:30:00Z',
  })
  updatedAt!: Date;
}

/**
 * Summary DTO for ticket types in list views
 */
export class TicketTypeSummaryDto {
  @ApiProperty({
    description: 'Minimum ticket price',
    example: 50.0,
  })
  minPrice!: number;

  @ApiProperty({
    description: 'Maximum ticket price',
    example: 200.0,
  })
  maxPrice!: number;

  @ApiProperty({
    description: 'Price currency',
    enum: Currency,
    example: Currency.TND,
  })
  currency!: Currency;

  @ApiProperty({
    description: 'Total ticket capacity across all types',
    example: 500,
  })
  totalCapacity!: number;

  @ApiProperty({
    description: 'Total tickets sold across all types',
    example: 150,
  })
  totalSold!: number;

  @ApiProperty({
    description: 'Total tickets available across all types',
    example: 350,
  })
  totalAvailable!: number;

  @ApiProperty({
    description: 'Number of ticket types',
    example: 3,
  })
  ticketTypeCount!: number;

  @ApiProperty({
    description: 'Whether any tickets are available',
    example: true,
  })
  hasAvailableTickets!: boolean;
}
