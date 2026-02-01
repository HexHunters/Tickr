/**
 * @file GetEventsByCategoryHandler Unit Tests
 * @description Tests for GetEventsByCategory query handler
 */

import { Logger } from '@nestjs/common';

import {
  GetEventsByCategoryQuery,
  GetEventsByCategoryHandler,
} from '@modules/events/application/queries/get-events-by-category';
import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';
import { EventEntity } from '@modules/events/domain/entities/event.entity';
import { TicketTypeEntity } from '@modules/events/domain/entities/ticket-type.entity';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { Currency } from '@modules/events/domain/value-objects/currency.vo';
import { LocationVO } from '@modules/events/domain/value-objects/location.vo';
import { EventDateRangeVO } from '@modules/events/domain/value-objects/event-date-range.vo';
import { TicketPriceVO } from '@modules/events/domain/value-objects/ticket-price.vo';
import { SalesPeriodVO } from '@modules/events/domain/value-objects/sales-period.vo';

describe('GetEventsByCategoryHandler', () => {
  let handler: GetEventsByCategoryHandler;
  let mockEventRepository: jest.Mocked<EventRepositoryPort>;

  const organizerId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

  beforeEach(() => {
    mockEventRepository = {
      findByCategory: jest.fn(),
    } as any;

    handler = new GetEventsByCategoryHandler(mockEventRepository);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create paginated result
  const createPaginatedResult = <T>(
    data: T[],
    total: number,
    page: number = 1,
    limit: number = 20,
  ) => {
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  };

  // Helper to create a test event
  const createTestEvent = (title: string, category: EventCategory): EventEntity => {
    const location = LocationVO.create({
      city: 'Sfax',
      country: 'Tunisia',
    });
    const dateRange = EventDateRangeVO.create(
      new Date('2026-08-01T19:00:00Z'),
      new Date('2026-08-01T23:00:00Z'),
      false,
    );

    const eventResult = EventEntity.create({
      organizerId,
      title,
      category,
      location,
      dateRange,
    });

    const event = eventResult.value;

    // Add a ticket type
    const ticketTypeResult = TicketTypeEntity.create({
      eventId: event.id,
      name: 'Standard',
      price: TicketPriceVO.create(30, Currency.TND),
      quantity: 200,
      salesPeriod: SalesPeriodVO.create(
        new Date('2026-07-01T00:00:00Z'),
        new Date('2026-07-31T23:59:59Z'),
      ),
    });

    event.addTicketType(ticketTypeResult.value);
    event.publish();

    return event;
  };

  describe('Success Cases', () => {
    it('should return events for a specific category', async () => {
      const events = [
        createTestEvent('Concert 1', EventCategory.CONCERT),
        createTestEvent('Concert 2', EventCategory.CONCERT),
      ];

      mockEventRepository.findByCategory.mockResolvedValue(
        createPaginatedResult(events, 2),
      );

      const query = new GetEventsByCategoryQuery(EventCategory.CONCERT);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data).toHaveLength(2);
      expect(result.value.total).toBe(2);
      expect(mockEventRepository.findByCategory).toHaveBeenCalledWith(
        EventCategory.CONCERT,
        expect.any(Object),
      );
    });

    it('should apply pagination', async () => {
      mockEventRepository.findByCategory.mockResolvedValue(
        createPaginatedResult([], 0, 3, 15),
      );

      const query = new GetEventsByCategoryQuery(EventCategory.CONFERENCE, 3, 15);
      await handler.execute(query);

      expect(mockEventRepository.findByCategory).toHaveBeenCalledWith(
        EventCategory.CONFERENCE,
        expect.objectContaining({
          page: 3,
          limit: 15,
        }),
      );
    });

    it('should apply sorting options', async () => {
      mockEventRepository.findByCategory.mockResolvedValue(
        createPaginatedResult([], 0),
      );

      const query = new GetEventsByCategoryQuery(EventCategory.SPORT, 1, 20, 'title', 'DESC');
      await handler.execute(query);

      expect(mockEventRepository.findByCategory).toHaveBeenCalledWith(
        EventCategory.SPORT,
        expect.objectContaining({
          sortBy: 'title',
          sortOrder: 'DESC',
        }),
      );
    });

    it('should return empty results when no events match', async () => {
      mockEventRepository.findByCategory.mockResolvedValue(
        createPaginatedResult([], 0),
      );

      const query = new GetEventsByCategoryQuery(EventCategory.OTHER);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data).toHaveLength(0);
      expect(result.value.total).toBe(0);
    });

    it('should handle all event categories', async () => {
      const categories = Object.values(EventCategory);

      for (const category of categories) {
        mockEventRepository.findByCategory.mockResolvedValue(
          createPaginatedResult([], 0),
        );

        const query = new GetEventsByCategoryQuery(category);
        const result = await handler.execute(query);

        expect(result.isSuccess).toBe(true);
        expect(mockEventRepository.findByCategory).toHaveBeenCalledWith(
          category,
          expect.any(Object),
        );
      }
    });

    it('should include ticket summary in results', async () => {
      const events = [createTestEvent('Festival', EventCategory.FESTIVAL)];

      mockEventRepository.findByCategory.mockResolvedValue(
        createPaginatedResult(events, 1),
      );

      const query = new GetEventsByCategoryQuery(EventCategory.FESTIVAL);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data[0].ticketSummary).toBeDefined();
      expect(result.value.data[0].ticketSummary.totalAvailable).toBe(200);
    });
  });

  describe('Query Immutability', () => {
    it('should create immutable query', () => {
      const query = new GetEventsByCategoryQuery(EventCategory.CONCERT);

      expect(Object.isFrozen(query)).toBe(true);
    });

    it('should create query from object', () => {
      const query = GetEventsByCategoryQuery.fromObject({
        category: EventCategory.THEATER,
        page: 2,
        limit: 30,
        sortBy: 'title',
        sortOrder: 'DESC',
      });

      expect(query.category).toBe(EventCategory.THEATER);
      expect(query.page).toBe(2);
      expect(query.limit).toBe(30);
      expect(query.sortBy).toBe('title');
      expect(query.sortOrder).toBe('DESC');
    });

    it('should use default pagination values', () => {
      const query = new GetEventsByCategoryQuery(EventCategory.EXHIBITION);

      expect(query.page).toBe(1);
      expect(query.limit).toBe(20);
    });
  });
});
