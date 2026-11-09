import { Inject, Injectable } from '@nestjs/common';

import type { EventEntity } from '../../../domain/entities/event.entity';
import type { AdminEventDto, PaginatedAdminEventsDto } from '../../dtos/admin-event.dto';
import { EVENT_STAFF_USER_DIRECTORY } from '../../ports/event-staff-user-directory.port';
import type { EventStaffUserDirectoryPort } from '../../ports/event-staff-user-directory.port';
import type { EventStaffUserInterface } from '../../ports/event-staff-user-directory.port';
import { EVENT_REPOSITORY } from '../../ports/event.repository.port';
import type { EventRepositoryPort } from '../../ports/event.repository.port';

import { GetAdminEventsQuery } from './get-admin-events.query';


/**
 * Handler for GetAdminEventsQuery
 *
 * Lists events of every status and hydrates organizer identities in one
 * batch call to the Users context.
 */
@Injectable()
export class GetAdminEventsHandler {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    @Inject(EVENT_STAFF_USER_DIRECTORY)
    private readonly userDirectory: EventStaffUserDirectoryPort,
  ) {}

  async execute(query: GetAdminEventsQuery): Promise<PaginatedAdminEventsDto> {
    const result = await this.eventRepository.findAll(
      {
        status: query.filters.status,
        category: query.filters.category,
        organizerId: query.filters.organizerId,
        titleSearch: query.filters.search?.trim() || undefined,
      },
      { page: query.page, limit: query.limit, sortBy: 'createdAt', sortOrder: 'DESC' },
    );

    const organizerIds = [...new Set(result.data.map((event) => event.organizerId))];
    const organizers = new Map(
      (await this.userDirectory.getUsersByIds(organizerIds)).map((user) => [user.id, user]),
    );

    return {
      data: result.data.map((event) => this.toDto(event, organizers.get(event.organizerId))),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  private toDto(event: EventEntity, organizer?: EventStaffUserInterface): AdminEventDto {
    return {
      id: event.id,
      title: event.title,
      category: event.category,
      status: event.status,
      city: event.location.city,
      startDate: event.dateRange.startDate,
      endDate: event.dateRange.endDate,
      organizer: {
        id: event.organizerId,
        name: organizer ? `${organizer.firstName} ${organizer.lastName}`.trim() : null,
        email: organizer?.email ?? null,
      },
      totalCapacity: event.totalCapacity,
      soldTickets: event.soldTickets,
      revenue: event.getTotalRevenueAmount(),
      currency: event.getRevenueCurrency(),
      commissionRateOverride: event.commissionRateOverride,
      freeTicketsEnabledOverride: event.freeTicketsEnabledOverride,
      cancellationReason: event.cancellationReason,
      createdAt: event.createdAt,
      publishedAt: event.publishedAt,
    };
  }
}
