import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { EventPublishedEvent } from '@modules/events/domain/events/event-published.event';
import { EventPublishedEventHandler } from '@modules/events/application/event-handlers/event-published.handler';

describe('EventPublishedEventHandler', () => {
  let handler: EventPublishedEventHandler;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventPublishedEventHandler],
    }).compile();

    handler = module.get<EventPublishedEventHandler>(EventPublishedEventHandler);
    
    // Spy on logger methods
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handle', () => {
    it('should log event publication', async () => {
      // Arrange
      const event = new EventPublishedEvent(
        'event-123',
        'organizer-456',
        'Summer Music Festival',
        new Date('2026-06-15T10:00:00Z'),
        3,
        500,
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Event published: "Summer Music Festival"'),
      );
    });

    it('should process event without throwing errors', async () => {
      // Arrange
      const event = new EventPublishedEvent(
        'event-789',
        'organizer-123',
        'Tech Conference 2026',
        new Date('2026-09-01T09:00:00Z'),
        5,
        1000,
      );

      // Act & Assert
      await expect(handler.handle(event)).resolves.not.toThrow();
    });

    it('should log successful processing', async () => {
      // Arrange
      const event = new EventPublishedEvent(
        'event-abc',
        'organizer-def',
        'Art Exhibition',
        new Date('2026-03-20T14:00:00Z'),
        2,
        200,
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully processed EventPublished'),
      );
    });
  });
});
