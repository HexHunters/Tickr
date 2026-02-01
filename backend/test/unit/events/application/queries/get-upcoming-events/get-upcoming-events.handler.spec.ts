/**
 * @file GetUpcomingEventsHandler Unit Tests
 * @description Tests for GetUpcomingEvents query handler
 */

import { Logger } from '@nestjs/common';

import {
  GetUpcomingEventsQuery,
  GetUpcomingEventsHandler,
} from '@modules/events/application/queries/get-upcoming-events';
import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';
import { EventEntity } from '@modules/events/domain/entities/event.entity';
import { TicketTypeEntity } from '@modules/events/domain/entities/ticket-type.entity';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { Currency } from '@modules/events/domain/value-objects/currency.vo';
import { LocationVO } from '@modules/events/domain/value-objects/location.vo';
import { EventDateRangeVO } from '@modules/events/domain/value-objects/event-date-range.vo';
import { TicketPriceVO } from '@modules/events/domain/value-objects/ticket-price.vo';
import { SalesPeriodVO } from '@modules/events/domain/value-objects/sales-period.vo';

describe('GetUpcomingEventsHandler', () => {
  let handler: GetUpcomingEventsHandler;
  let mockEventRepository: jest.Mocked<EventRepositoryPort>;

  const organizerId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

  beforeEach(() => {
    mockEventRepository = {
      findUpcoming: jest.fn(),
      findPublished: jest.fn(),
    } as any;

    handler = new GetUpcomingEventsHandler(mockEventRepository);

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

  // Helper to create a test event with upcoming date
  const createTestEvent = (
    title: string,
    city: string = 'Tunis',
    country: string = 'Tunisia',
  ): EventEntity => {
    const location = LocationVO.create({
      city,
      country,
    });
    
    // Create event in the future
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 2);
    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 4);

    const dateRange = EventDateRangeVO.create(
      futureDate,
      endDate,
      false,
    );

    const eventResult = EventEntity.create({
      organizerId,
      title,
      category: EventCategory.CONCERT,
      location,
      dateRange,
    });

    const event = eventResult.value;

    // Add a ticket type with future sales period
    const salesStart = new Date();
    const salesEnd = new Date(futureDate);
    salesEnd.setDate(salesEnd.getDate() - 1);

    const ticketTypeResult = TicketTypeEntity.create({
      eventId: event.id,
      name: 'General Admission',
      price: TicketPriceVO.create(45, Currency.TND),
      quantity: 150,
      salesPeriod: SalesPeriodVO.create(salesStart, salesEnd),
    });

    event.addTicketType(ticketTypeResult.value);
    event.publish();

    return event;
  };

  describe('Success Cases', () => {
    it('should return upcoming events without filters', async () => {
      const events = [
        createTestEvent('Upcoming Event 1'),
        createTestEvent('Upcoming Event 2'),
      ];

      mockEventRepository.findUpcoming.mockResolvedValue(
        createPaginatedResult(events, 2),
      );

      const query = new GetUpcomingEventsQuery();
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data).toHaveLength(2);
      expect(result.value.total).toBe(2);
    });

    it('should filter by city', async () => {
      const events = [createTestEvent('Sousse Event', 'Sousse')];

      // When city is provided, handler uses findPublished with filters
      mockEventRepository.findPublished.mockResolvedValue(
        createPaginatedResult(events, 1),
      );

      const query = new GetUpcomingEventsQuery('Sousse');
      await handler.execute(query);

      expect(mockEventRepository.findPublished).toHaveBeenCalledWith(
        expect.objectContaining({
          city: 'Sousse',
        }),
        expect.any(Object),
      );
    });

    it('should filter by country', async () => {
      const events = [createTestEvent('Paris Event', 'Paris', 'France')];

      // When country is provided, handler uses findPublished with filters
      mockEventRepository.findPublished.mockResolvedValue(
        createPaginatedResult(events, 1),
      );

      const query = new GetUpcomingEventsQuery(undefined, 'France');
      await handler.execute(query);

      expect(mockEventRepository.findPublished).toHaveBeenCalledWith(
        expect.objectContaining({
          country: 'France',
        }),
        expect.any(Object),
      );
    });

    it('should filter by both city and country', async () => {
      // When location filters are provided, handler uses findPublished
      mockEventRepository.findPublished.mockResolvedValue(
        createPaginatedResult([], 0),
      );

      const query = new GetUpcomingEventsQuery('Sfax', 'Tunisia');
      await handler.execute(query);

      expect(mockEventRepository.findPublished).toHaveBeenCalledWith(
        expect.objectContaining({
          city: 'Sfax',
          country: 'Tunisia',
        }),
        expect.any(Object),
      );
    });

    it('should apply pagination', async () => {
      mockEventRepository.findUpcoming.mockResolvedValue(
        createPaginatedResult([], 0, 2, 10),
      );

      const query = new GetUpcomingEventsQuery(undefined, undefined, 2, 10);
      await handler.execute(query);

      // Without filters, uses findUpcoming with just options
      expect(mockEventRepository.findUpcoming).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 10,
        }),
      );
    });

    it('should return empty results when no upcoming events', async () => {
      mockEventRepository.findUpcoming.mockResolvedValue(
        createPaginatedResult([], 0),
      );

      const query = new GetUpcomingEventsQuery();
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data).toHaveLength(0);
      expect(result.value.total).toBe(0);
    });

    it('should include ticket summary in results', async () => {
      const events = [createTestEvent('Event with Tickets')];

      mockEventRepository.findUpcoming.mockResolvedValue(
        createPaginatedResult(events, 1),
      );

      const query = new GetUpcomingEventsQuery();
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data[0].ticketSummary).toBeDefined();
      expect(result.value.data[0].ticketSummary.minPrice).toBe(45);
    });

    it('should return correct pagination metadata', async () => {
      const events = [createTestEvent('Event')];

      mockEventRepository.findUpcoming.mockResolvedValue({
        data: events,
        total: 50,
        page: 2,
        limit: 10,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true,
      });

      const query = new GetUpcomingEventsQuery(undefined, undefined, 2, 10);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.total).toBe(50);
      expect(result.value.page).toBe(2);
      expect(result.value.totalPages).toBe(5);
      expect(result.value.hasNextPage).toBe(true);
      expect(result.value.hasPreviousPage).toBe(true);
    });
  });

  describe('Query Immutability', () => {
    it('should create immutable query', () => {
      const query = new GetUpcomingEventsQuery();

      expect(Object.isFrozen(query)).toBe(true);
    });

    it('should create query from object with defaults', () => {
      const query = GetUpcomingEventsQuery.fromObject({});

      expect(query.city).toBeUndefined();
      expect(query.country).toBeUndefined();
      expect(query.page).toBe(1);
      expect(query.limit).toBe(20);
    });

    it('should create query from object with custom values', () => {
      const query = GetUpcomingEventsQuery.fromObject({
        city: 'Monastir',
        country: 'Tunisia',
        page: 3,
        limit: 25,
      });

      expect(query.city).toBe('Monastir');
      expect(query.country).toBe('Tunisia');
      expect(query.page).toBe(3);
      expect(query.limit).toBe(25);
    });
  });
});
