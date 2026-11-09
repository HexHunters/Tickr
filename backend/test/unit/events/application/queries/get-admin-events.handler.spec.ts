import type { EventStaffUserDirectoryPort } from '@modules/events/application/ports/event-staff-user-directory.port';
import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';
import { GetAdminEventsHandler } from '@modules/events/application/queries/get-admin-events/get-admin-events.handler';
import { GetAdminEventsQuery } from '@modules/events/application/queries/get-admin-events/get-admin-events.query';
import { GetEventStatusCountsHandler } from '@modules/events/application/queries/get-event-status-counts/get-event-status-counts.handler';
import { GetEventStatusCountsQuery } from '@modules/events/application/queries/get-event-status-counts/get-event-status-counts.query';
import { EventEntity } from '@modules/events/domain/entities/event.entity';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventDateRangeVO } from '@modules/events/domain/value-objects/event-date-range.vo';
import { EventStatus } from '@modules/events/domain/value-objects/event-status.vo';
import { LocationVO } from '@modules/events/domain/value-objects/location.vo';

describe('Back-office event queries', () => {
  const organizerId = '550e8400-e29b-41d4-a716-446655440002';
  const unknownOrganizerId = '550e8400-e29b-41d4-a716-446655440009';
  let eventRepository: jest.Mocked<Pick<EventRepositoryPort, 'findAll' | 'countByStatus'>>;
  let userDirectory: jest.Mocked<Pick<EventStaffUserDirectoryPort, 'getUsersByIds'>>;

  function createEvent(title: string, owner: string): EventEntity {
    const startDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return EventEntity.create({
      organizerId: owner,
      title,
      category: EventCategory.CONCERT,
      location: LocationVO.create({ city: 'Tunis', country: 'Tunisia' }),
      dateRange: EventDateRangeVO.create(
        startDate,
        new Date(startDate.getTime() + 3 * 60 * 60 * 1000),
        true,
      ),
    }).value;
  }

  beforeEach(() => {
    eventRepository = { findAll: jest.fn(), countByStatus: jest.fn() };
    userDirectory = {
      getUsersByIds: jest.fn().mockResolvedValue([
        {
          id: organizerId,
          email: 'studio@example.com',
          firstName: 'Tickr',
          lastName: 'Studio',
          role: 'ORGANIZER',
          isActive: true,
          emailVerified: true,
        },
      ]),
    };
  });

  it('lists events of any status with organizer identities fetched in one batch', async () => {
    eventRepository.findAll.mockResolvedValue({
      data: [
        createEvent('Nuit du jazz', organizerId),
        createEvent('Matinale', organizerId),
        createEvent('Orphan', unknownOrganizerId),
      ],
      total: 3,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
    const handler = new GetAdminEventsHandler(
      eventRepository as unknown as EventRepositoryPort,
      userDirectory as unknown as EventStaffUserDirectoryPort,
    );

    const result = await handler.execute(
      new GetAdminEventsQuery({ status: EventStatus.DRAFT, search: '  jazz ' }, 1, 20),
    );

    expect(eventRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: EventStatus.DRAFT, titleSearch: 'jazz' }),
      expect.objectContaining({ page: 1, limit: 20, sortBy: 'createdAt' }),
    );
    expect(userDirectory.getUsersByIds).toHaveBeenCalledTimes(1);
    expect(userDirectory.getUsersByIds).toHaveBeenCalledWith([organizerId, unknownOrganizerId]);
    expect(result.data[0]).toMatchObject({
      title: 'Nuit du jazz',
      status: EventStatus.DRAFT,
      city: 'Tunis',
      organizer: { id: organizerId, name: 'Tickr Studio', email: 'studio@example.com' },
      commissionRateOverride: null,
      freeTicketsEnabledOverride: null,
    });
    expect(result.data[2].organizer).toEqual({ id: unknownOrganizerId, name: null, email: null });
  });

  it('returns counts for every status', async () => {
    const counts = {
      [EventStatus.DRAFT]: 2,
      [EventStatus.PUBLISHED]: 5,
      [EventStatus.CANCELLED]: 1,
      [EventStatus.COMPLETED]: 0,
    };
    eventRepository.countByStatus.mockResolvedValue(counts);
    const handler = new GetEventStatusCountsHandler(eventRepository as unknown as EventRepositoryPort);

    await expect(handler.execute(new GetEventStatusCountsQuery())).resolves.toEqual(counts);
  });
});
