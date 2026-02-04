import { EventCancelledEventHandler } from '@modules/events/application/event-handlers/event-cancelled.handler';
import { EventCancelledEvent } from '@modules/events/domain/events/event-cancelled.event';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';


describe('EventCancelledEventHandler', () => {
  let handler: EventCancelledEventHandler;
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventCancelledEventHandler],
    }).compile();

    handler = module.get<EventCancelledEventHandler>(EventCancelledEventHandler);
    
    // Spy on logger methods
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handle', () => {
    it('should log event cancellation', async () => {
      // Arrange
      const event = new EventCancelledEvent(
        'event-123',
        'organizer-456',
        'Summer Music Festival',
        'Venue unavailable due to maintenance',
        new Date('2026-02-01T15:00:00Z'),
        50,
        { amount: 5000, currency: 'TND' },
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Event cancelled: "Summer Music Festival"'),
      );
    });

    it('should log cancellation reason', async () => {
      // Arrange
      const reason = 'Weather conditions unsafe for outdoor event';
      const event = new EventCancelledEvent(
        'event-789',
        'organizer-123',
        'Beach Festival',
        reason,
        new Date('2026-07-15T10:00:00Z'),
        100,
        { amount: 10000, currency: 'TND' },
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(reason),
      );
    });

    it('should warn about needed refunds when tickets were sold', async () => {
      // Arrange
      const event = new EventCancelledEvent(
        'event-abc',
        'organizer-def',
        'Concert Cancelled',
        'Artist illness',
        new Date('2026-04-10T12:00:00Z'),
        200, // 200 tickets sold
        { amount: 20000, currency: 'TND' },
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Refunds needed: 200 tickets sold'),
      );
    });

    it('should not warn about refunds when no tickets were sold', async () => {
      // Arrange
      const event = new EventCancelledEvent(
        'event-xyz',
        'organizer-789',
        'Unpopular Event',
        'Low interest',
        new Date('2026-05-20T08:00:00Z'),
        0, // No tickets sold
        { amount: 0, currency: 'TND' },
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should process event without throwing errors', async () => {
      // Arrange
      const event = new EventCancelledEvent(
        'event-test',
        'organizer-test',
        'Test Event',
        'Test cancellation',
        new Date(),
        10,
        { amount: 1000, currency: 'TND' },
      );

      // Act & Assert
      await expect(handler.handle(event)).resolves.not.toThrow();
    });

    it('should log successful processing', async () => {
      // Arrange
      const event = new EventCancelledEvent(
        'event-final',
        'organizer-final',
        'Final Test',
        'Completed testing',
        new Date(),
        5,
        { amount: 500, currency: 'TND' },
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully processed EventCancelled'),
      );
    });
  });
});
