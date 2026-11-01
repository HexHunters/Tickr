import type { EventCategory } from '../../domain/value-objects/event-category.vo';
import type { EventStatus } from '../../domain/value-objects/event-status.vo';

/**
 * Organizer identity shown in the back office
 */
export interface AdminEventOrganizerDto {
  readonly id: string;
  readonly name: string | null;
  readonly email: string | null;
}

/**
 * Event row for the back office (all statuses)
 */
export interface AdminEventDto {
  readonly id: string;
  readonly title: string;
  readonly category: EventCategory;
  readonly status: EventStatus;
  readonly city: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly organizer: AdminEventOrganizerDto;
  readonly totalCapacity: number;
  readonly soldTickets: number;
  readonly revenue: number;
  readonly currency: string;
  readonly commissionRateOverride: number | null;
  /** true allows, false blocks, null inherits FREE_TICKETS_ENABLED */
  readonly freeTicketsEnabledOverride: boolean | null;
  readonly cancellationReason: string | null;
  readonly createdAt: Date;
  readonly publishedAt: Date | null;
}

export interface PaginatedAdminEventsDto {
  readonly data: AdminEventDto[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}
