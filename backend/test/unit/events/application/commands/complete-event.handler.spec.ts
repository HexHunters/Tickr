/**
 * @file CompleteEventHandler Unit Tests
 * @description Tests for CompleteEvent command handler
 */

import { Logger } from '@nestjs/common';

import { EventEntity } from '@modules/events/domain/entities/event.entity';
import { EventStatus } from '@modules/events/domain/value-objects/event-status.vo';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { LocationVO } from '@modules/events/domain/value-objects/location.vo';
import { EventDateRangeVO } from '@modules/events/domain/value-objects/event-date-range.vo';
import {
  CompleteEventCommand,
  CompleteEventHandler,
} from '@modules/events/application/commands/complete-event';
import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';

describe('CompleteEventHandler', () => {
  let handler: CompleteEventHandler;
  let mockEventRepository: {
    findById: jest.Mock;
    save: jest.Mock;
  };

  const eventId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  const organizerId = 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e';

  // Helper to create a mock event
  function createMockEvent(overrides: {
    status?: EventStatus;
    hasEnded?: boolean;
  } = {}): EventEntity {
    const now = new Date();
    
    // Create dates based on hasEnded flag
    let startDate: Date;
    let endDate: Date;
    
    if (overrides.hasEnded) {
      // Past event
      startDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      endDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else {
      // Future event
      startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    }

    const location = LocationVO.create({
      address: '123 Test Street',
      city: 'Test City',
      postalCode: '12345',
      country: 'France',
    });

    // For past events, we need to bypass future date validation
    const dateRange = overrides.hasEnded
      ? EventDateRangeVO.createFromExisting(startDate, endDate)
      : EventDateRangeVO.create(startDate, endDate);

    const eventResult = EventEntity.create({
      id: eventId,
      organizerId,
      title: 'Test Event',
      description: 'A test event',
      category: EventCategory.CONCERT,
      location,
      dateRange,
    });

    const event = eventResult.value!;

    // Mock the status and hasEnded for testing
    if (overrides.status !== undefined) {
      Object.defineProperty(event, 'status', {
        get: () => overrides.status,
        configurable: true,
      });
    }

    if (overrides.hasEnded !== undefined) {
      jest.spyOn(event, 'hasEnded').mockReturnValue(overrides.hasEnded);
    }

    return event;
  }

  beforeEach(() => {
    // Suppress logs during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    mockEventRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    handler = new CompleteEventHandler(
      mockEventRepository as unknown as EventRepositoryPort,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('execute', () => {
    describe('successful completion', () => {
      it('should mark a published ended event as completed', async () => {
        const event = createMockEvent({
          status: EventStatus.PUBLISHED,
          hasEnded: true,
        });
        mockEventRepository.findById.mockResolvedValue(event);
        mockEventRepository.save.mockResolvedValue(event);

        const command = new CompleteEventCommand(eventId);
        const result = await handler.execute(command);

        expect(result.isSuccess).toBe(true);
        expect(mockEventRepository.save).toHaveBeenCalledWith(event);
      });
    });

    describe('validation errors', () => {
      it('should fail if event not found', async () => {
        mockEventRepository.findById.mockResolvedValue(null);

        const command = new CompleteEventCommand(eventId);
        const result = await handler.execute(command);

        expect(result.isFailure).toBe(true);
        expect(result.error).toEqual({
          type: 'EVENT_NOT_FOUND',
          message: `Event with id '${eventId}' not found`,
        });
      });

      it('should fail if event is in DRAFT status', async () => {
        const event = createMockEvent({
          status: EventStatus.DRAFT,
          hasEnded: true,
        });
        mockEventRepository.findById.mockResolvedValue(event);

        const command = new CompleteEventCommand(eventId);
        const result = await handler.execute(command);

        expect(result.isFailure).toBe(true);
        expect(result.error?.type).toBe('INVALID_STATUS');
        expect(result.error?.message).toContain('not published');
      });

      it('should fail if event is already CANCELLED', async () => {
        const event = createMockEvent({
          status: EventStatus.CANCELLED,
          hasEnded: true,
        });
        mockEventRepository.findById.mockResolvedValue(event);

        const command = new CompleteEventCommand(eventId);
        const result = await handler.execute(command);

        expect(result.isFailure).toBe(true);
        expect(result.error?.type).toBe('INVALID_STATUS');
      });

      it('should fail if event is already COMPLETED', async () => {
        const event = createMockEvent({
          status: EventStatus.COMPLETED,
          hasEnded: true,
        });
        mockEventRepository.findById.mockResolvedValue(event);

        const command = new CompleteEventCommand(eventId);
        const result = await handler.execute(command);

        expect(result.isFailure).toBe(true);
        expect(result.error?.type).toBe('INVALID_STATUS');
      });

      it('should fail if event has not ended yet', async () => {
        const event = createMockEvent({
          status: EventStatus.PUBLISHED,
          hasEnded: false,
        });
        mockEventRepository.findById.mockResolvedValue(event);

        const command = new CompleteEventCommand(eventId);
        const result = await handler.execute(command);

        expect(result.isFailure).toBe(true);
        expect(result.error?.type).toBe('EVENT_NOT_ENDED');
        expect(result.error?.message).toContain('has not ended yet');
      });
    });
  });
});
