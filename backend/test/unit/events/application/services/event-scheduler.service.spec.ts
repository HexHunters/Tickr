/**
 * @file EventSchedulerService Unit Tests
 * @description Tests for the event scheduler service and cron jobs
 */

import { CompleteEventHandler } from '@modules/events/application/commands/complete-event/complete-event.handler';
import { EVENT_REPOSITORY } from '@modules/events/application/ports/event.repository.port';
import { EventSchedulerService } from '@modules/events/application/services/event-scheduler.service';
import { EventEntity } from '@modules/events/domain/entities/event.entity';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventDateRangeVO } from '@modules/events/domain/value-objects/event-date-range.vo';
import { EventStatus } from '@modules/events/domain/value-objects/event-status.vo';
import { LocationVO } from '@modules/events/domain/value-objects/location.vo';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Result } from '@shared/domain/result';

describe('EventSchedulerService', () => {
  let service: EventSchedulerService;
  let mockEventRepository: {
    findEventsToComplete: jest.Mock;
  };
  let mockCompleteEventHandler: {
    execute: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  const eventId1 = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  const eventId2 = 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e';
  const organizerId = 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f';

  // Helper to create a mock event
  function createMockEvent(id: string): EventEntity {
    const now = new Date();
    const pastStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const pastEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const location = LocationVO.create({
      address: '123 Test Street',
      city: 'Test City',
      postalCode: '12345',
      country: 'France',
    });

    const dateRange = EventDateRangeVO.createFromExisting(pastStart, pastEnd);

    const eventResult = EventEntity.create({
      id,
      organizerId,
      title: 'Test Event',
      description: 'A test event',
      category: EventCategory.CONCERT,
      location,
      dateRange,
    });

    const event = eventResult.value!;
    
    // Mock as PUBLISHED and ended
    Object.defineProperty(event, 'status', {
      get: () => EventStatus.PUBLISHED,
      configurable: true,
    });
    jest.spyOn(event, 'hasEnded').mockReturnValue(true);

    return event;
  }

  beforeEach(async () => {
    // Suppress logs during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    mockEventRepository = {
      findEventsToComplete: jest.fn(),
    };

    mockCompleteEventHandler = {
      execute: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(true), // Scheduler enabled by default
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventSchedulerService,
        {
          provide: EVENT_REPOSITORY,
          useValue: mockEventRepository,
        },
        {
          provide: CompleteEventHandler,
          useValue: mockCompleteEventHandler,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EventSchedulerService>(EventSchedulerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('processEndedEvents', () => {
    it('should process and complete all ended events', async () => {
      const events = [createMockEvent(eventId1), createMockEvent(eventId2)];
      mockEventRepository.findEventsToComplete.mockResolvedValue(events);
      mockCompleteEventHandler.execute.mockResolvedValue(Result.okVoid());

      const result = await service.processEndedEvents();

      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockCompleteEventHandler.execute).toHaveBeenCalledTimes(2);
    });

    it('should return empty stats when no events to complete', async () => {
      mockEventRepository.findEventsToComplete.mockResolvedValue([]);

      const result = await service.processEndedEvents();

      expect(result.processed).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockCompleteEventHandler.execute).not.toHaveBeenCalled();
    });

    it('should handle partial failures gracefully', async () => {
      const events = [createMockEvent(eventId1), createMockEvent(eventId2)];
      mockEventRepository.findEventsToComplete.mockResolvedValue(events);
      
      // First succeeds, second fails
      mockCompleteEventHandler.execute
        .mockResolvedValueOnce(Result.okVoid())
        .mockResolvedValueOnce(
          Result.fail({ type: 'INVALID_STATUS', message: 'Already completed' }),
        );

      const result = await service.processEndedEvents();

      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].eventId).toBe(eventId2);
    });

    it('should handle exceptions from handler gracefully', async () => {
      const events = [createMockEvent(eventId1)];
      mockEventRepository.findEventsToComplete.mockResolvedValue(events);
      mockCompleteEventHandler.execute.mockRejectedValue(new Error('DB error'));

      const result = await service.processEndedEvents();

      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toBe('DB error');
    });
  });

  describe('completeEndedEvents (cron)', () => {
    it('should call processEndedEvents when enabled', async () => {
      mockEventRepository.findEventsToComplete.mockResolvedValue([]);
      
      await service.completeEndedEvents();

      expect(mockEventRepository.findEventsToComplete).toHaveBeenCalled();
    });

    it('should skip processing when scheduler is disabled', async () => {
      // Recreate service with disabled scheduler
      mockConfigService.get.mockReturnValue(false);
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EventSchedulerService,
          {
            provide: EVENT_REPOSITORY,
            useValue: mockEventRepository,
          },
          {
            provide: CompleteEventHandler,
            useValue: mockCompleteEventHandler,
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const disabledService = module.get<EventSchedulerService>(EventSchedulerService);
      
      await disabledService.completeEndedEvents();

      expect(mockEventRepository.findEventsToComplete).not.toHaveBeenCalled();
    });
  });

  describe('triggerCompleteEndedEvents', () => {
    it('should process events regardless of scheduler enabled state', async () => {
      const events = [createMockEvent(eventId1)];
      mockEventRepository.findEventsToComplete.mockResolvedValue(events);
      mockCompleteEventHandler.execute.mockResolvedValue(Result.okVoid());

      const result = await service.triggerCompleteEndedEvents();

      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(1);
    });
  });
});
