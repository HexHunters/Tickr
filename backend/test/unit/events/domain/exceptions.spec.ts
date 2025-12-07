import { EventNotCancellableException } from '@modules/events/domain/exceptions/event-not-cancellable.exception';
import { EventNotPublishableException } from '@modules/events/domain/exceptions/event-not-publishable.exception';
import { InvalidCurrencyException } from '@modules/events/domain/exceptions/invalid-currency.exception';
import { InvalidDateRangeException } from '@modules/events/domain/exceptions/invalid-date-range.exception';
import { InvalidEventCategoryException } from '@modules/events/domain/exceptions/invalid-event-category.exception';
import { InvalidEventException } from '@modules/events/domain/exceptions/invalid-event.exception';
import { InvalidLocationException } from '@modules/events/domain/exceptions/invalid-location.exception';
import { InvalidPriceException } from '@modules/events/domain/exceptions/invalid-price.exception';
import { InvalidTicketTypeException } from '@modules/events/domain/exceptions/invalid-ticket-type.exception';

describe('Events Domain Exceptions', () => {
  describe('InvalidDateRangeException', () => {
    it('should create with message', () => {
      const exception = new InvalidDateRangeException('Test message');

      expect(exception.message).toBe('Test message');
      expect(exception.code).toBe('INVALID_DATE_RANGE');
      expect(exception.name).toBe('InvalidDateRangeException');
    });

    it('should have timestamp', () => {
      const before = new Date();
      const exception = new InvalidDateRangeException('Test');
      const after = new Date();

      expect(exception.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(exception.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    describe('factory methods', () => {
      it('should create endBeforeStart exception', () => {
        const exception = InvalidDateRangeException.endBeforeStart();

        expect(exception.message).toContain('End date must be after start date');
      });

      it('should create invalidStartDate exception', () => {
        const exception = InvalidDateRangeException.invalidStartDate();

        expect(exception.message).toContain('Start date must be a valid date');
      });

      it('should create invalidEndDate exception', () => {
        const exception = InvalidDateRangeException.invalidEndDate();

        expect(exception.message).toContain('End date must be a valid date');
      });

      it('should create startDateInPast exception', () => {
        const exception = InvalidDateRangeException.startDateInPast();

        expect(exception.message).toContain('future');
      });

      it('should create salesEndAfterEventStart exception', () => {
        const exception = InvalidDateRangeException.salesEndAfterEventStart();

        expect(exception.message).toContain('Sales end date must be before event start date');
      });
    });

    it('should serialize to JSON', () => {
      const exception = new InvalidDateRangeException('Test message');
      const json = exception.toJSON();

      expect(json).toHaveProperty('name', 'InvalidDateRangeException');
      expect(json).toHaveProperty('code', 'INVALID_DATE_RANGE');
      expect(json).toHaveProperty('message', 'Test message');
      expect(json).toHaveProperty('timestamp');
    });
  });

  describe('InvalidLocationException', () => {
    it('should create with message', () => {
      const exception = new InvalidLocationException('Location error');

      expect(exception.message).toBe('Location error');
      expect(exception.code).toBe('INVALID_LOCATION');
      expect(exception.name).toBe('InvalidLocationException');
    });

    describe('factory methods', () => {
      it('should create missingCity exception', () => {
        const exception = InvalidLocationException.missingCity();

        expect(exception.message).toContain('City is required');
      });

      it('should create missingCountry exception', () => {
        const exception = InvalidLocationException.missingCountry();

        expect(exception.message).toContain('Country is required');
      });

      it('should create invalidLatitude exception', () => {
        const exception = InvalidLocationException.invalidLatitude();

        expect(exception.message).toContain('Latitude must be between -90 and 90');
      });

      it('should create invalidLongitude exception', () => {
        const exception = InvalidLocationException.invalidLongitude();

        expect(exception.message).toContain('Longitude must be between -180 and 180');
      });

      it('should create incompleteCoordinates exception', () => {
        const exception = InvalidLocationException.incompleteCoordinates();

        expect(exception.message).toContain('Both latitude and longitude');
      });

      it('should create addressTooLong exception', () => {
        const exception = InvalidLocationException.addressTooLong(500);

        expect(exception.message).toContain('500');
        expect(exception.message).toContain('characters');
      });
    });
  });

  describe('InvalidPriceException', () => {
    it('should create with message', () => {
      const exception = new InvalidPriceException('Price error');

      expect(exception.message).toBe('Price error');
      expect(exception.code).toBe('INVALID_PRICE');
      expect(exception.name).toBe('InvalidPriceException');
    });

    describe('factory methods', () => {
      it('should create mustBePositive exception', () => {
        const exception = InvalidPriceException.mustBePositive();

        expect(exception.message).toContain('greater than 0');
      });

      it('should create invalidAmount exception', () => {
        const exception = InvalidPriceException.invalidAmount();

        expect(exception.message).toContain('valid number');
      });

      it('should create currencyMismatch exception', () => {
        const exception = InvalidPriceException.currencyMismatch('TND', 'EUR');

        expect(exception.message).toContain('TND');
        expect(exception.message).toContain('EUR');
        expect(exception.message).toContain('different currencies');
      });

      it('should create unsupportedCurrency exception', () => {
        const exception = InvalidPriceException.unsupportedCurrency('GBP');

        expect(exception.message).toContain('GBP');
        expect(exception.message).toContain('Unsupported');
      });

      it('should create negativeResult exception', () => {
        const exception = InvalidPriceException.negativeResult();

        expect(exception.message).toContain('negative');
      });

      it('should create invalidPercentage exception', () => {
        const exception = InvalidPriceException.invalidPercentage();

        expect(exception.message).toContain('0 and 100');
      });
    });
  });

  describe('InvalidCurrencyException', () => {
    it('should create with message', () => {
      const exception = new InvalidCurrencyException('Currency error');

      expect(exception.message).toBe('Currency error');
      expect(exception.code).toBe('INVALID_CURRENCY');
      expect(exception.name).toBe('InvalidCurrencyException');
    });

    describe('factory methods', () => {
      it('should create unsupported exception', () => {
        const exception = InvalidCurrencyException.unsupported('GBP', ['TND', 'EUR', 'USD']);

        expect(exception.message).toContain('GBP');
        expect(exception.message).toContain('TND');
        expect(exception.message).toContain('Unsupported');
      });

      it('should create mismatch exception', () => {
        const exception = InvalidCurrencyException.mismatch('TND', 'EUR');

        expect(exception.message).toContain('TND');
        expect(exception.message).toContain('EUR');
        expect(exception.message).toContain('mismatch');
      });
    });
  });

  describe('EventNotPublishableException', () => {
    it('should create with message', () => {
      const exception = new EventNotPublishableException('Cannot publish');

      expect(exception.message).toBe('Cannot publish');
      expect(exception.code).toBe('EVENT_NOT_PUBLISHABLE');
      expect(exception.name).toBe('EventNotPublishableException');
    });

    describe('factory methods', () => {
      it('should create wrongStatus exception', () => {
        const exception = EventNotPublishableException.wrongStatus('CANCELLED');

        expect(exception.message).toContain('CANCELLED');
        expect(exception.message).toContain('DRAFT');
      });

      it('should create missingTicketTypes exception', () => {
        const exception = EventNotPublishableException.missingTicketTypes();

        expect(exception.message).toContain('ticket type');
      });

      it('should create missingLocation exception', () => {
        const exception = EventNotPublishableException.missingLocation();

        expect(exception.message).toContain('location');
      });

      it('should create invalidDateRange exception', () => {
        const exception = EventNotPublishableException.invalidDateRange();

        expect(exception.message).toContain('date range');
      });

      it('should create missingTitle exception', () => {
        const exception = EventNotPublishableException.missingTitle();

        expect(exception.message).toContain('title');
      });

      it('should create eventDateInPast exception', () => {
        const exception = EventNotPublishableException.eventDateInPast();

        expect(exception.message).toContain('past');
      });

      it('should create validationFailed exception with reasons', () => {
        const exception = EventNotPublishableException.validationFailed([
          'Missing title',
          'No ticket types',
        ]);

        expect(exception.message).toContain('Missing title');
        expect(exception.message).toContain('No ticket types');
      });
    });
  });

  describe('EventNotCancellableException', () => {
    it('should create with message', () => {
      const exception = new EventNotCancellableException('Cannot cancel');

      expect(exception.message).toBe('Cannot cancel');
      expect(exception.code).toBe('EVENT_NOT_CANCELLABLE');
      expect(exception.name).toBe('EventNotCancellableException');
    });

    describe('factory methods', () => {
      it('should create wrongStatus exception', () => {
        const exception = EventNotCancellableException.wrongStatus('COMPLETED');

        expect(exception.message).toContain('COMPLETED');
        expect(exception.message).toContain('DRAFT or PUBLISHED');
      });

      it('should create eventAlreadyStarted exception', () => {
        const exception = EventNotCancellableException.eventAlreadyStarted();

        expect(exception.message).toContain('started');
      });

      it('should create eventAlreadyCompleted exception', () => {
        const exception = EventNotCancellableException.eventAlreadyCompleted();

        expect(exception.message).toContain('completed');
      });

      it('should create eventAlreadyCancelled exception', () => {
        const exception = EventNotCancellableException.eventAlreadyCancelled();

        expect(exception.message).toContain('already cancelled');
      });
    });
  });

  describe('InvalidTicketTypeException', () => {
    it('should create with message', () => {
      const exception = new InvalidTicketTypeException('Ticket type error');

      expect(exception.message).toBe('Ticket type error');
      expect(exception.code).toBe('INVALID_TICKET_TYPE');
      expect(exception.name).toBe('InvalidTicketTypeException');
    });

    describe('factory methods', () => {
      it('should create missingName exception', () => {
        const exception = InvalidTicketTypeException.missingName();

        expect(exception.message).toContain('name is required');
      });

      it('should create nameTooLong exception', () => {
        const exception = InvalidTicketTypeException.nameTooLong(100);

        expect(exception.message).toContain('100');
        expect(exception.message).toContain('characters');
      });

      it('should create invalidQuantity exception', () => {
        const exception = InvalidTicketTypeException.invalidQuantity();

        expect(exception.message).toContain('greater than 0');
      });

      it('should create soldExceedsQuantity exception', () => {
        const exception = InvalidTicketTypeException.soldExceedsQuantity();

        expect(exception.message).toContain('exceed');
      });

      it('should create cannotReduceQuantity exception', () => {
        const exception = InvalidTicketTypeException.cannotReduceQuantity(50);

        expect(exception.message).toContain('50');
        expect(exception.message).toContain('already sold');
      });

      it('should create cannotModifyAfterSales exception', () => {
        const exception = InvalidTicketTypeException.cannotModifyAfterSales();

        expect(exception.message).toContain('after sales');
      });

      it('should create maximumReached exception', () => {
        const exception = InvalidTicketTypeException.maximumReached(10);

        expect(exception.message).toContain('10');
        expect(exception.message).toContain('Maximum');
      });

      it('should create duplicateName exception', () => {
        const exception = InvalidTicketTypeException.duplicateName('VIP');

        expect(exception.message).toContain('VIP');
        expect(exception.message).toContain('already exists');
      });

      it('should create invalidSalesPeriod exception', () => {
        const exception = InvalidTicketTypeException.invalidSalesPeriod();

        expect(exception.message).toContain('before event start');
      });
    });
  });

  describe('InvalidEventException', () => {
    it('should create with message', () => {
      const exception = new InvalidEventException('Event error');

      expect(exception.message).toBe('Event error');
      expect(exception.code).toBe('INVALID_EVENT');
      expect(exception.name).toBe('InvalidEventException');
    });

    describe('factory methods', () => {
      it('should create missingTitle exception', () => {
        const exception = InvalidEventException.missingTitle();

        expect(exception.message).toContain('title is required');
      });

      it('should create titleTooLong exception', () => {
        const exception = InvalidEventException.titleTooLong(200);

        expect(exception.message).toContain('200');
        expect(exception.message).toContain('characters');
      });

      it('should create descriptionTooLong exception', () => {
        const exception = InvalidEventException.descriptionTooLong(5000);

        expect(exception.message).toContain('5000');
        expect(exception.message).toContain('characters');
      });

      it('should create missingOrganizer exception', () => {
        const exception = InvalidEventException.missingOrganizer();

        expect(exception.message).toContain('organizer');
      });

      it('should create invalidCategory exception', () => {
        const exception = InvalidEventException.invalidCategory('INVALID');

        expect(exception.message).toContain('INVALID');
        expect(exception.message).toContain('category');
      });

      it('should create cannotModifyPublished exception', () => {
        const exception = InvalidEventException.cannotModifyPublished();

        expect(exception.message).toContain('published');
      });

      it('should create insufficientTickets exception', () => {
        const exception = InvalidEventException.insufficientTickets(5, 10);

        expect(exception.message).toContain('5');
        expect(exception.message).toContain('10');
        expect(exception.message).toContain('Insufficient');
      });

      it('should create notFound exception', () => {
        const exception = InvalidEventException.notFound('event-123');

        expect(exception.message).toContain('event-123');
        expect(exception.message).toContain('not found');
      });

      it('should create ticketTypeNotFound exception', () => {
        const exception = InvalidEventException.ticketTypeNotFound('ticket-456');

        expect(exception.message).toContain('ticket-456');
        expect(exception.message).toContain('not found');
      });
    });
  });

  describe('InvalidEventCategoryException', () => {
    it('should create with message', () => {
      const exception = new InvalidEventCategoryException('Test message');

      expect(exception.message).toBe('Test message');
      expect(exception.code).toBe('INVALID_EVENT_CATEGORY');
      expect(exception.name).toBe('InvalidEventCategoryException');
    });

    it('should have timestamp', () => {
      const before = new Date();
      const exception = new InvalidEventCategoryException('Test');
      const after = new Date();

      expect(exception.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(exception.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    describe('factory methods', () => {
      it('should create invalidValue exception', () => {
        const exception = InvalidEventCategoryException.invalidValue('INVALID');

        expect(exception.message).toContain('Invalid category: INVALID');
        expect(exception.message).toContain('CONCERT');
        expect(exception.message).toContain('CONFERENCE');
      });

      it('should create empty exception', () => {
        const exception = InvalidEventCategoryException.empty();

        expect(exception.message).toContain('Event category is required');
      });
    });
  });

  describe('Exception inheritance', () => {
    it('all exceptions should be Error instances', () => {
      expect(new InvalidDateRangeException('test')).toBeInstanceOf(Error);
      expect(new InvalidLocationException('test')).toBeInstanceOf(Error);
      expect(new InvalidPriceException('test')).toBeInstanceOf(Error);
      expect(new InvalidCurrencyException('test')).toBeInstanceOf(Error);
      expect(new EventNotPublishableException('test')).toBeInstanceOf(Error);
      expect(new EventNotCancellableException('test')).toBeInstanceOf(Error);
      expect(new InvalidTicketTypeException('test')).toBeInstanceOf(Error);
      expect(new InvalidEventException('test')).toBeInstanceOf(Error);
      expect(new InvalidEventCategoryException('test')).toBeInstanceOf(Error);
    });

    it('all exceptions should have required properties', () => {
      const exceptions = [
        new InvalidDateRangeException('test'),
        new InvalidLocationException('test'),
        new InvalidPriceException('test'),
        new InvalidCurrencyException('test'),
        new EventNotPublishableException('test'),
        new EventNotCancellableException('test'),
        new InvalidTicketTypeException('test'),
        new InvalidEventException('test'),
        new InvalidEventCategoryException('test'),
      ];

      exceptions.forEach((exception) => {
        expect(exception).toHaveProperty('code');
        expect(exception).toHaveProperty('timestamp');
        expect(exception).toHaveProperty('message');
        expect(exception).toHaveProperty('name');
        expect(typeof exception.toJSON).toBe('function');
      });
    });
  });
});
