import { InvalidDateRangeException } from '@modules/events/domain/exceptions/invalid-date-range.exception';
import { SalesPeriodVO } from '@modules/events/domain/value-objects/sales-period.vo';

describe('SalesPeriod Value Object', () => {
  // Helper to create future dates
  const futureDate = (hoursFromNow: number): Date => {
    const date = new Date();
    date.setHours(date.getHours() + hoursFromNow);
    return date;
  };

  const pastDate = (hoursAgo: number): Date => {
    const date = new Date();
    date.setHours(date.getHours() - hoursAgo);
    return date;
  };

  describe('create', () => {
    it('should create a valid sales period', () => {
      const start = futureDate(1);
      const end = futureDate(24);

      const salesPeriod = SalesPeriodVO.create(start, end);

      expect(salesPeriod).toBeInstanceOf(SalesPeriodVO);
      expect(salesPeriod.startDate.getTime()).toBe(start.getTime());
      expect(salesPeriod.endDate.getTime()).toBe(end.getTime());
    });

    it('should allow sales periods in the past (for existing data)', () => {
      const start = pastDate(48);
      const end = pastDate(24);

      const salesPeriod = SalesPeriodVO.create(start, end);

      expect(salesPeriod).toBeInstanceOf(SalesPeriodVO);
    });

    it('should throw if end date is before start date', () => {
      const start = futureDate(24);
      const end = futureDate(1);

      expect(() => SalesPeriodVO.create(start, end)).toThrow(InvalidDateRangeException);
      expect(() => SalesPeriodVO.create(start, end)).toThrow('after');
    });

    it('should throw if end date equals start date', () => {
      const date = futureDate(24);

      expect(() => SalesPeriodVO.create(date, date)).toThrow(InvalidDateRangeException);
    });

    it('should throw if start date is invalid', () => {
      const invalidDate = new Date('invalid');
      const end = futureDate(24);

      expect(() => SalesPeriodVO.create(invalidDate, end)).toThrow(InvalidDateRangeException);
      expect(() => SalesPeriodVO.create(invalidDate, end)).toThrow('valid date');
    });

    it('should throw if end date is invalid', () => {
      const start = futureDate(1);
      const invalidDate = new Date('invalid');

      expect(() => SalesPeriodVO.create(start, invalidDate)).toThrow(InvalidDateRangeException);
      expect(() => SalesPeriodVO.create(start, invalidDate)).toThrow('valid date');
    });
  });

  describe('startingNow', () => {
    it('should create a sales period starting now', () => {
      const end = futureDate(24);
      const before = new Date();

      const salesPeriod = SalesPeriodVO.startingNow(end);

      const after = new Date();

      expect(salesPeriod.startDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(salesPeriod.startDate.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(salesPeriod.endDate.getTime()).toBe(end.getTime());
    });
  });

  describe('withDuration', () => {
    it('should create a sales period with specified duration', () => {
      const start = futureDate(1);
      const durationDays = 7;

      const salesPeriod = SalesPeriodVO.withDuration(start, durationDays);

      const expectedEnd = new Date(start);
      expectedEnd.setDate(expectedEnd.getDate() + durationDays);

      expect(salesPeriod.startDate.getTime()).toBe(start.getTime());
      expect(salesPeriod.durationInDays).toBe(durationDays);
    });

    it('should handle different durations', () => {
      const start = futureDate(1);

      const oneDaySales = SalesPeriodVO.withDuration(start, 1);
      const thirtyDaySales = SalesPeriodVO.withDuration(start, 30);

      expect(oneDaySales.durationInDays).toBe(1);
      expect(thirtyDaySales.durationInDays).toBe(30);
    });
  });

  describe('duration calculations', () => {
    it('should calculate duration in hours', () => {
      const start = new Date('2025-12-01T10:00:00Z');
      const end = new Date('2025-12-01T22:00:00Z'); // 12 hours

      const salesPeriod = SalesPeriodVO.create(start, end);

      expect(salesPeriod.durationInHours).toBe(12);
    });

    it('should calculate duration in days', () => {
      const start = new Date('2025-12-01T00:00:00Z');
      const end = new Date('2025-12-08T00:00:00Z'); // 7 days

      const salesPeriod = SalesPeriodVO.create(start, end);

      expect(salesPeriod.durationInDays).toBe(7);
    });

    it('should round up partial durations', () => {
      const start = new Date('2025-12-01T00:00:00Z');
      const end = new Date('2025-12-01T02:30:00Z'); // 2.5 hours

      const salesPeriod = SalesPeriodVO.create(start, end);

      expect(salesPeriod.durationInHours).toBe(3); // Rounded up
    });
  });

  describe('sales status methods', () => {
    describe('isOnSale', () => {
      it('should return true when currently on sale', () => {
        const salesPeriod = SalesPeriodVO.create(pastDate(24), futureDate(24));

        expect(salesPeriod.isOnSale()).toBe(true);
      });

      it('should return false when sales not started', () => {
        const salesPeriod = SalesPeriodVO.create(futureDate(24), futureDate(48));

        expect(salesPeriod.isOnSale()).toBe(false);
      });

      it('should return false when sales ended', () => {
        const salesPeriod = SalesPeriodVO.create(pastDate(48), pastDate(24));

        expect(salesPeriod.isOnSale()).toBe(false);
      });
    });

    describe('isPending', () => {
      it('should return true when sales not started', () => {
        const salesPeriod = SalesPeriodVO.create(futureDate(24), futureDate(48));

        expect(salesPeriod.isPending()).toBe(true);
      });

      it('should return false when currently on sale', () => {
        const salesPeriod = SalesPeriodVO.create(pastDate(24), futureDate(24));

        expect(salesPeriod.isPending()).toBe(false);
      });

      it('should return false when sales ended', () => {
        const salesPeriod = SalesPeriodVO.create(pastDate(48), pastDate(24));

        expect(salesPeriod.isPending()).toBe(false);
      });
    });

    describe('hasEnded', () => {
      it('should return true when sales ended', () => {
        const salesPeriod = SalesPeriodVO.create(pastDate(48), pastDate(24));

        expect(salesPeriod.hasEnded()).toBe(true);
      });

      it('should return false when currently on sale', () => {
        const salesPeriod = SalesPeriodVO.create(pastDate(24), futureDate(24));

        expect(salesPeriod.hasEnded()).toBe(false);
      });

      it('should return false when sales not started', () => {
        const salesPeriod = SalesPeriodVO.create(futureDate(24), futureDate(48));

        expect(salesPeriod.hasEnded()).toBe(false);
      });
    });

    describe('getStatus', () => {
      it('should return pending for future sales', () => {
        const salesPeriod = SalesPeriodVO.create(futureDate(24), futureDate(48));

        expect(salesPeriod.getStatus()).toBe('pending');
      });

      it('should return active for ongoing sales', () => {
        const salesPeriod = SalesPeriodVO.create(pastDate(24), futureDate(24));

        expect(salesPeriod.getStatus()).toBe('active');
      });

      it('should return ended for past sales', () => {
        const salesPeriod = SalesPeriodVO.create(pastDate(48), pastDate(24));

        expect(salesPeriod.getStatus()).toBe('ended');
      });
    });
  });

  describe('time until calculations', () => {
    it('should return positive time until start for pending sales', () => {
      const salesPeriod = SalesPeriodVO.create(futureDate(24), futureDate(48));

      expect(salesPeriod.getTimeUntilStart()).toBeGreaterThan(0);
    });

    it('should return negative time until start for started sales', () => {
      const salesPeriod = SalesPeriodVO.create(pastDate(24), futureDate(24));

      expect(salesPeriod.getTimeUntilStart()).toBeLessThan(0);
    });

    it('should return positive time until end for active sales', () => {
      const salesPeriod = SalesPeriodVO.create(pastDate(24), futureDate(24));

      expect(salesPeriod.getTimeUntilEnd()).toBeGreaterThan(0);
    });

    it('should return negative time until end for ended sales', () => {
      const salesPeriod = SalesPeriodVO.create(pastDate(48), pastDate(24));

      expect(salesPeriod.getTimeUntilEnd()).toBeLessThan(0);
    });
  });

  describe('contains', () => {
    it('should return true for date within period', () => {
      const start = new Date('2025-12-01T00:00:00Z');
      const end = new Date('2025-12-15T00:00:00Z');
      const salesPeriod = SalesPeriodVO.create(start, end);

      const middleDate = new Date('2025-12-08T00:00:00Z');

      expect(salesPeriod.contains(middleDate)).toBe(true);
    });

    it('should return true for start date', () => {
      const start = new Date('2025-12-01T00:00:00Z');
      const end = new Date('2025-12-15T00:00:00Z');
      const salesPeriod = SalesPeriodVO.create(start, end);

      expect(salesPeriod.contains(start)).toBe(true);
    });

    it('should return true for end date', () => {
      const start = new Date('2025-12-01T00:00:00Z');
      const end = new Date('2025-12-15T00:00:00Z');
      const salesPeriod = SalesPeriodVO.create(start, end);

      expect(salesPeriod.contains(end)).toBe(true);
    });

    it('should return false for date before period', () => {
      const start = new Date('2025-12-01T00:00:00Z');
      const end = new Date('2025-12-15T00:00:00Z');
      const salesPeriod = SalesPeriodVO.create(start, end);

      const beforeDate = new Date('2025-11-15T00:00:00Z');

      expect(salesPeriod.contains(beforeDate)).toBe(false);
    });

    it('should return false for date after period', () => {
      const start = new Date('2025-12-01T00:00:00Z');
      const end = new Date('2025-12-15T00:00:00Z');
      const salesPeriod = SalesPeriodVO.create(start, end);

      const afterDate = new Date('2025-12-20T00:00:00Z');

      expect(salesPeriod.contains(afterDate)).toBe(false);
    });
  });

  describe('overlaps', () => {
    it('should detect overlapping periods', () => {
      const period1 = SalesPeriodVO.create(
        new Date('2025-12-01T00:00:00Z'),
        new Date('2025-12-15T00:00:00Z'),
      );
      const period2 = SalesPeriodVO.create(
        new Date('2025-12-10T00:00:00Z'),
        new Date('2025-12-25T00:00:00Z'),
      );

      expect(period1.overlaps(period2)).toBe(true);
      expect(period2.overlaps(period1)).toBe(true);
    });

    it('should detect non-overlapping periods', () => {
      const period1 = SalesPeriodVO.create(
        new Date('2025-12-01T00:00:00Z'),
        new Date('2025-12-10T00:00:00Z'),
      );
      const period2 = SalesPeriodVO.create(
        new Date('2025-12-15T00:00:00Z'),
        new Date('2025-12-25T00:00:00Z'),
      );

      expect(period1.overlaps(period2)).toBe(false);
      expect(period2.overlaps(period1)).toBe(false);
    });
  });

  describe('validateForEvent', () => {
    it('should return true when sales end before event start', () => {
      const salesPeriod = SalesPeriodVO.create(
        new Date('2025-12-01T00:00:00Z'),
        new Date('2025-12-14T23:59:59Z'),
      );
      const eventStartDate = new Date('2025-12-15T10:00:00Z');

      expect(salesPeriod.validateForEvent(eventStartDate)).toBe(true);
    });

    it('should return false when sales end after event start', () => {
      const salesPeriod = SalesPeriodVO.create(
        new Date('2025-12-01T00:00:00Z'),
        new Date('2025-12-15T12:00:00Z'),
      );
      const eventStartDate = new Date('2025-12-15T10:00:00Z');

      expect(salesPeriod.validateForEvent(eventStartDate)).toBe(false);
    });

    it('should return false when sales end equals event start', () => {
      const eventStartDate = new Date('2025-12-15T10:00:00Z');
      const salesPeriod = SalesPeriodVO.create(
        new Date('2025-12-01T00:00:00Z'),
        new Date(eventStartDate), // Same time
      );

      expect(salesPeriod.validateForEvent(eventStartDate)).toBe(false);
    });
  });

  describe('formatted output', () => {
    it('should format range string', () => {
      const start = new Date('2025-12-01T10:00:00Z');
      const end = new Date('2025-12-15T18:00:00Z');
      const salesPeriod = SalesPeriodVO.create(start, end);

      const formatted = salesPeriod.getFormattedRange('en-US');

      expect(formatted).toContain('Dec');
      expect(formatted).toContain('2025');
    });

    it('should return ISO strings', () => {
      const start = new Date('2025-12-01T10:00:00Z');
      const end = new Date('2025-12-15T18:00:00Z');
      const salesPeriod = SalesPeriodVO.create(start, end);

      const isoStrings = salesPeriod.toISOStrings();

      expect(isoStrings.startDate).toBe('2025-12-01T10:00:00.000Z');
      expect(isoStrings.endDate).toBe('2025-12-15T18:00:00.000Z');
    });
  });

  describe('immutability', () => {
    it('should return new Date instances for startDate', () => {
      const start = futureDate(1);
      const end = futureDate(24);
      const salesPeriod = SalesPeriodVO.create(start, end);

      const date1 = salesPeriod.startDate;
      const date2 = salesPeriod.startDate;

      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });

    it('should return new Date instances for endDate', () => {
      const start = futureDate(1);
      const end = futureDate(24);
      const salesPeriod = SalesPeriodVO.create(start, end);

      const date1 = salesPeriod.endDate;
      const date2 = salesPeriod.endDate;

      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });

    it('should not be affected by changes to original dates', () => {
      const start = futureDate(1);
      const end = futureDate(24);
      const originalStartTime = start.getTime();

      const salesPeriod = SalesPeriodVO.create(start, end);

      start.setFullYear(2030);

      expect(salesPeriod.startDate.getTime()).toBe(originalStartTime);
    });
  });
});
