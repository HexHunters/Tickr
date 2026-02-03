import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { TicketTypeSoldOutEvent } from '@modules/events/domain/events/ticket-type-sold-out.event';
import { TicketTypeSoldOutEventHandler } from '@modules/events/application/event-handlers/ticket-type-sold-out.handler';

describe('TicketTypeSoldOutEventHandler', () => {
  let handler: TicketTypeSoldOutEventHandler;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketTypeSoldOutEventHandler],
    }).compile();

    handler = module.get<TicketTypeSoldOutEventHandler>(TicketTypeSoldOutEventHandler);
    
    // Spy on logger methods
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handle', () => {
    it('should log ticket type sold out', async () => {
      // Arrange
      const event = new TicketTypeSoldOutEvent(
        'ticket-type-123',
        'event-456',
        'VIP Pass',
        50,
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Ticket type sold out: "VIP Pass"'),
      );
    });

    it('should include event ID in log', async () => {
      // Arrange
      const eventId = 'event-abc-123';
      const event = new TicketTypeSoldOutEvent(
        'ticket-type-789',
        eventId,
        'Standard Ticket',
        100,
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(eventId),
      );
    });

    it('should process event without throwing errors', async () => {
      // Arrange
      const event = new TicketTypeSoldOutEvent(
        'ticket-type-test',
        'event-test',
        'Test Ticket',
        25,
      );

      // Act & Assert
      await expect(handler.handle(event)).resolves.not.toThrow();
    });

    it('should log successful processing', async () => {
      // Arrange
      const ticketTypeId = 'ticket-type-final';
      const event = new TicketTypeSoldOutEvent(
        ticketTypeId,
        'event-final',
        'Early Bird',
        200,
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Successfully processed TicketTypeSoldOut for ticket type ${ticketTypeId}`),
      );
    });

    it('should handle various ticket quantities', async () => {
      // Arrange
      const quantities = [1, 10, 100, 1000, 10000];

      for (const quantity of quantities) {
        const event = new TicketTypeSoldOutEvent(
          `ticket-${quantity}`,
          'event-123',
          `Ticket Type ${quantity}`,
          quantity,
        );

        // Act & Assert
        await expect(handler.handle(event)).resolves.not.toThrow();
      }
    });
  });
});
