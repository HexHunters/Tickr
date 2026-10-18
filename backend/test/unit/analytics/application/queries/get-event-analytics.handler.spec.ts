import type { CachePort } from '@modules/analytics/application/ports/cache.port';
import type { EventAccessPort } from '@modules/analytics/application/ports/event-access.port';
import type { EventAnalyticsRepositoryPort } from '@modules/analytics/application/ports/event-analytics.repository.port';
import { GetEventAnalyticsHandler } from '@modules/analytics/application/queries/get-event-analytics/get-event-analytics.handler';
import { GetEventAnalyticsQuery } from '@modules/analytics/application/queries/get-event-analytics/get-event-analytics.query';
import { EventAnalyticsEntity } from '@modules/analytics/domain/entities/event-analytics.entity';
import { TimeSeriesDataVO } from '@modules/analytics/domain/value-objects/time-series-data.vo';
import { Logger } from '@nestjs/common';

describe('GetEventAnalyticsHandler', () => {
  let handler: GetEventAnalyticsHandler;
  let mockRepository: jest.Mocked<EventAnalyticsRepositoryPort>;
  let mockCache: jest.Mocked<CachePort>;
  let mockEventAccess: jest.Mocked<EventAccessPort>;

  const eventId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = '660e8400-e29b-41d4-a716-446655440000';

  const mockEntity = EventAnalyticsEntity.reconstitute({
    eventId,
    totalRevenue: 5000,
    currency: 'TND',
    totalTicketsSold: 100,
    totalCapacity: 200,
    checkInCount: 80,
    conversionRate: 50,
    averageTicketPrice: 50,
    topSellingTicketType: 'VIP',
    salesByDay: [TimeSeriesDataVO.create(new Date('2025-01-01'), 100, '2025-01-01')],
    checkInsByHour: [],
    lastUpdated: new Date(),
  });

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByEventId: jest.fn(),
      findByOrganizerId: jest.fn(),
      deleteByEventId: jest.fn(),
    } as jest.Mocked<EventAnalyticsRepositoryPort>;

    mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<CachePort>;

    mockEventAccess = { findOrganizerId: jest.fn().mockResolvedValue(userId) };
    handler = new GetEventAnalyticsHandler(mockRepository, mockCache, mockEventAccess);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  describe('execute', () => {
    it.each([null, { eventId, totalRevenue: 5000 }])(
      'denies unrelated users before reading cache or analytics (%s)',
      async (cachedData) => {
        mockCache.get.mockResolvedValue(cachedData);

        const result = await handler.execute(new GetEventAnalyticsQuery(eventId, 'other-user'));

        expect(result.isFailure).toBe(true);
        expect(result.error.type).toBe('ACCESS_DENIED');
        expect(mockCache.get).not.toHaveBeenCalled();
        expect(mockRepository.findByEventId).not.toHaveBeenCalled();
      },
    );

    it('rechecks current ownership on each cached request', async () => {
      mockCache.get.mockResolvedValue({ eventId, totalRevenue: 5000 });
      const query = new GetEventAnalyticsQuery(eventId, userId);
      expect((await handler.execute(query)).isSuccess).toBe(true);

      mockEventAccess.findOrganizerId.mockResolvedValue('new-owner');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('ACCESS_DENIED');
      expect(mockCache.get).toHaveBeenCalledTimes(1);
    });

    it('allows admins to read existing event analytics', async () => {
      mockCache.get.mockResolvedValue({ eventId });

      const result = await handler.execute(new GetEventAnalyticsQuery(eventId, 'admin-user', true));

      expect(result.isSuccess).toBe(true);
    });

    it('does not return cached analytics for a deleted event', async () => {
      mockEventAccess.findOrganizerId.mockResolvedValue(null);
      mockCache.get.mockResolvedValue({ eventId });

      const result = await handler.execute(new GetEventAnalyticsQuery(eventId, userId));

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('NOT_FOUND');
      expect(mockCache.get).not.toHaveBeenCalled();
    });

    it('should return analytics from cache when available', async () => {
      const cachedData = { eventId, totalRevenue: 5000 };
      mockCache.get.mockResolvedValue(cachedData);

      const query = new GetEventAnalyticsQuery(eventId, userId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(cachedData);
      expect(mockRepository.findByEventId).not.toHaveBeenCalled();
    });

    it('should query repository on cache miss', async () => {
      mockRepository.findByEventId.mockResolvedValue(mockEntity);

      const query = new GetEventAnalyticsQuery(eventId, userId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.eventId).toBe(eventId);
      expect(result.value.totalRevenue).toBe(5000);
      expect(mockCache.set).toHaveBeenCalledTimes(1);
    });

    it('should return NOT_FOUND when analytics do not exist', async () => {
      mockRepository.findByEventId.mockResolvedValue(null);

      const query = new GetEventAnalyticsQuery(eventId, userId);
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('NOT_FOUND');
    });
  });
});
