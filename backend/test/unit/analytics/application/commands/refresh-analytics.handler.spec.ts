import { RefreshAnalyticsCommand } from '@modules/analytics/application/commands/refresh-analytics/refresh-analytics.command';
import { RefreshAnalyticsHandler } from '@modules/analytics/application/commands/refresh-analytics/refresh-analytics.handler';
import { ANALYTICS_CACHE } from '@modules/analytics/application/ports/cache.port';
import { EVENT_ANALYTICS_REPOSITORY } from '@modules/analytics/application/ports/event-analytics.repository.port';
import { METRIC_REPOSITORY } from '@modules/analytics/application/ports/metric.repository.port';
import type { MetricAggregation } from '@modules/analytics/application/ports/metric.repository.port';
import { PLATFORM_ANALYTICS_REPOSITORY } from '@modules/analytics/application/ports/platform-analytics.repository.port';
import { MetricEntity } from '@modules/analytics/domain/entities/metric.entity';
import type { PlatformAnalyticsEntity } from '@modules/analytics/domain/entities/platform-analytics.entity';
import { EntityType } from '@modules/analytics/domain/value-objects/entity-type.vo';
import { MetricType } from '@modules/analytics/domain/value-objects/metric-type.vo';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('RefreshAnalyticsHandler', () => {
  const now = new Date('2026-10-21T12:00:00Z');
  const eventId = '550e8400-e29b-41d4-a716-446655440001';
  const otherEventId = '550e8400-e29b-41d4-a716-446655440002';

  function createDependencies() {
    return {
      metrics: {
        findByType: jest.fn().mockResolvedValue([]),
        findByEntityAndType: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue([]),
        sumByEntityAndType: jest.fn().mockResolvedValue(0),
        countByEntityAndType: jest.fn().mockResolvedValue(0),
      },
      events: { save: jest.fn() },
      platform: {
        save: jest.fn(async (entity: PlatformAnalyticsEntity) => entity),
      },
      cache: { invalidatePattern: jest.fn().mockResolvedValue(undefined) },
      publisher: { publish: jest.fn().mockResolvedValue(undefined) },
    };
  }

  function revenue(
    entityId: string,
    value: number,
    dimensions?: Record<string, unknown>,
    entityType: EntityType = EntityType.EVENT,
  ): MetricEntity {
    return MetricEntity.create({
      metricType: MetricType.REVENUE,
      entityId,
      entityType,
      value,
      dimensions,
    }).value;
  }

  function aggregate(
    metricType: MetricType,
    entityId: string,
    sum: number,
  ): MetricAggregation {
    return {
      metricType,
      entityId,
      sum,
      count: 1,
      avg: sum,
      min: sum,
      max: sum,
    };
  }

  let handler: RefreshAnalyticsHandler;
  let dependencies: ReturnType<typeof createDependencies>;

  beforeEach(async () => {
    jest.useFakeTimers({ now });
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    dependencies = createDependencies();
    const module = await Test.createTestingModule({
      providers: [
        RefreshAnalyticsHandler,
        { provide: METRIC_REPOSITORY, useValue: dependencies.metrics },
        { provide: EVENT_ANALYTICS_REPOSITORY, useValue: dependencies.events },
        {
          provide: PLATFORM_ANALYTICS_REPOSITORY,
          useValue: dependencies.platform,
        },
        { provide: ANALYTICS_CACHE, useValue: dependencies.cache },
        { provide: DomainEventPublisher, useValue: dependencies.publisher },
      ],
    }).compile();
    handler = module.get(RefreshAnalyticsHandler);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('aggregates event totals and historical fees instead of applying a fixed rate', async () => {
    dependencies.metrics.findByType.mockResolvedValue([
      revenue(eventId, 100, { platformFeeAmount: 6 }),
      revenue(otherEventId, 50, { platformFeeAmount: 2.5 }),
      revenue(otherEventId, 999, { platformFeeAmount: 99 }, EntityType.USER),
    ]);
    dependencies.metrics.aggregate
      .mockResolvedValueOnce([
        aggregate(MetricType.TICKET_SOLD, eventId, 4),
        aggregate(MetricType.TICKET_SOLD, otherEventId, 3),
      ])
      .mockResolvedValueOnce([
        aggregate(MetricType.EVENT_CREATED, eventId, 1),
        aggregate(MetricType.EVENT_CREATED, otherEventId, 1),
      ]);

    const result = await handler.execute(
      new RefreshAnalyticsCommand('platform'),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ refreshedEvents: 0, platformUpdated: true });
    expect(dependencies.platform.save).toHaveBeenCalledWith(
      expect.objectContaining({
        totalRevenue: 150,
        platformCommission: 8.5,
        totalTicketsSold: 7,
        totalEvents: 2,
      }),
    );
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    expect(dependencies.metrics.findByType).toHaveBeenCalledWith(
      MetricType.REVENUE,
      periodStart,
      now,
    );
    for (const metricType of [
      MetricType.TICKET_SOLD,
      MetricType.EVENT_CREATED,
    ]) {
      expect(dependencies.metrics.aggregate).toHaveBeenCalledWith({
        metricType,
        entityType: EntityType.EVENT,
        startDate: periodStart,
        endDate: now,
      });
    }
    expect(dependencies.metrics.sumByEntityAndType).not.toHaveBeenCalled();
    expect(dependencies.metrics.countByEntityAndType).not.toHaveBeenCalled();
    expect(dependencies.events.save).not.toHaveBeenCalled();
    expect(dependencies.cache.invalidatePattern).toHaveBeenCalledWith(
      'analytics:*',
    );
    expect(dependencies.publisher.publish).toHaveBeenCalledTimes(1);
  });

  it.each([0, undefined, 'invalid', NaN, Infinity, -1])(
    'does not invent commission for a zero, missing or invalid fee (%s)',
    async (fee) => {
      dependencies.metrics.findByType.mockResolvedValue([
        revenue(
          eventId,
          100,
          fee === undefined ? undefined : { platformFeeAmount: fee },
        ),
      ]);
      const result = await handler.execute(
        new RefreshAnalyticsCommand('platform'),
      );
      expect(result.isSuccess).toBe(true);
      expect(dependencies.platform.save).toHaveBeenCalledWith(
        expect.objectContaining({
          totalRevenue: 100,
          platformCommission: 0,
        }),
      );
    },
  );

  it('persists zero totals for an empty period', async () => {
    const result = await handler.execute(
      new RefreshAnalyticsCommand('platform'),
    );
    expect(result.isSuccess).toBe(true);
    expect(dependencies.platform.save).toHaveBeenCalledWith(
      expect.objectContaining({
        totalRevenue: 0,
        platformCommission: 0,
        totalTicketsSold: 0,
        totalEvents: 0,
      }),
    );
  });

  it('does not refresh the platform for an event-only request', async () => {
    const result = await handler.execute(new RefreshAnalyticsCommand('event'));
    expect(result.value).toEqual({
      refreshedEvents: 0,
      platformUpdated: false,
    });
    expect(dependencies.platform.save).not.toHaveBeenCalled();
    expect(dependencies.metrics.aggregate).not.toHaveBeenCalled();
  });

  it('refreshes both views and deduplicates event IDs for a full refresh', async () => {
    const sold = MetricEntity.create({
      metricType: MetricType.TICKET_SOLD,
      entityId: eventId,
      entityType: EntityType.EVENT,
      value: 2,
    }).value;
    dependencies.metrics.findByType
      .mockResolvedValueOnce([sold, sold])
      .mockResolvedValueOnce([]);
    const result = await handler.execute(new RefreshAnalyticsCommand());
    expect(result.value).toEqual({ refreshedEvents: 1, platformUpdated: true });
    expect(dependencies.events.save).toHaveBeenCalledTimes(1);
    expect(dependencies.platform.save).toHaveBeenCalledTimes(1);
  });

  it.each(['aggregate', 'save'])(
    'reports %s failures without invalidation or publication',
    async (operation) => {
      if (operation === 'aggregate') {
        dependencies.metrics.aggregate.mockRejectedValue(new Error('db down'));
      } else {
        dependencies.platform.save.mockRejectedValue(new Error('db down'));
      }
      const result = await handler.execute(
        new RefreshAnalyticsCommand('platform'),
      );
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('REFRESH_FAILED');
      expect(dependencies.cache.invalidatePattern).not.toHaveBeenCalled();
      expect(dependencies.publisher.publish).not.toHaveBeenCalled();
    },
  );
});
