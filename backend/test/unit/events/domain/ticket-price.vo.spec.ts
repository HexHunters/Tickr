import { TicketPriceVO } from '@modules/events/domain/value-objects/ticket-price.vo';
import { Currency } from '@modules/events/domain/value-objects/currency.vo';
import { InvalidPriceException } from '@modules/events/domain/exceptions/invalid-price.exception';

describe('TicketPrice Value Object', () => {
  describe('create', () => {
    it('should create a valid ticket price with default currency (TND)', () => {
      const price = TicketPriceVO.create(100);
      expect(price.amount).toBe(100);
      expect(price.currency).toBe(Currency.TND);
    });

    it('should create a ticket price with specified currency', () => {
      const price = TicketPriceVO.create(50, Currency.EUR);
      expect(price.amount).toBe(50);
      expect(price.currency).toBe(Currency.EUR);
    });

    it('should round TND to 3 decimal places', () => {
      const price = TicketPriceVO.create(99.9999, Currency.TND);
      expect(price.amount).toBe(100);
    });

    it('should round EUR to 2 decimal places', () => {
      const price = TicketPriceVO.create(99.999, Currency.EUR);
      expect(price.amount).toBe(100);
    });
  });

  describe('factory methods', () => {
    it('should create price in TND', () => {
      const price = TicketPriceVO.inTND(150);
      expect(price.amount).toBe(150);
      expect(price.currency).toBe(Currency.TND);
    });

    it('should create price in EUR', () => {
      const price = TicketPriceVO.inEUR(75);
      expect(price.amount).toBe(75);
      expect(price.currency).toBe(Currency.EUR);
    });

    it('should create price in USD', () => {
      const price = TicketPriceVO.inUSD(100);
      expect(price.amount).toBe(100);
      expect(price.currency).toBe(Currency.USD);
    });
  });

  describe('validation', () => {
    it('should throw for zero price', () => {
      expect(() => TicketPriceVO.create(0)).toThrow(InvalidPriceException);
    });

    it('should throw for negative price', () => {
      expect(() => TicketPriceVO.create(-50)).toThrow(InvalidPriceException);
    });

    it('should throw for NaN', () => {
      expect(() => TicketPriceVO.create(NaN)).toThrow(InvalidPriceException);
    });

    it('should throw for invalid currency', () => {
      expect(() => TicketPriceVO.create(100, 'GBP' as Currency)).toThrow(InvalidPriceException);
    });
  });

  describe('formatted', () => {
    it('should format TND price', () => {
      const price = TicketPriceVO.inTND(100);
      expect(price.formatted).toContain('100');
    });

    it('should format EUR price with symbol', () => {
      const price = TicketPriceVO.inEUR(50);
      expect(price.formatted).toContain('50');
      expect(price.formatted).toContain('€');
    });

    it('should format USD price with symbol', () => {
      const price = TicketPriceVO.inUSD(75);
      expect(price.formatted).toContain('75');
      expect(price.formatted).toContain('$');
    });
  });

  describe('symbol', () => {
    it('should return correct symbols', () => {
      expect(TicketPriceVO.inTND(100).symbol).toBe('DT');
      expect(TicketPriceVO.inEUR(100).symbol).toBe('€');
      expect(TicketPriceVO.inUSD(100).symbol).toBe('$');
    });
  });

  describe('arithmetic operations', () => {
    describe('add', () => {
      it('should add two prices of same currency', () => {
        const price1 = TicketPriceVO.inTND(100);
        const price2 = TicketPriceVO.inTND(50);
        const result = price1.add(price2);
        expect(result.amount).toBe(150);
        expect(result.currency).toBe(Currency.TND);
      });

      it('should throw when adding different currencies', () => {
        const price1 = TicketPriceVO.inTND(100);
        const price2 = TicketPriceVO.inEUR(50);
        expect(() => price1.add(price2)).toThrow(InvalidPriceException);
      });
    });

    describe('subtract', () => {
      it('should subtract two prices of same currency', () => {
        const price1 = TicketPriceVO.inTND(100);
        const price2 = TicketPriceVO.inTND(30);
        const result = price1.subtract(price2);
        expect(result.amount).toBe(70);
        expect(result.currency).toBe(Currency.TND);
      });

      it('should throw when result would be negative', () => {
        const price1 = TicketPriceVO.inTND(30);
        const price2 = TicketPriceVO.inTND(50);
        expect(() => price1.subtract(price2)).toThrow(InvalidPriceException);
      });

      it('should throw when subtracting different currencies', () => {
        const price1 = TicketPriceVO.inTND(100);
        const price2 = TicketPriceVO.inEUR(50);
        expect(() => price1.subtract(price2)).toThrow(InvalidPriceException);
      });
    });

    describe('multiply', () => {
      it('should multiply price by factor', () => {
        const price = TicketPriceVO.inTND(100);
        const result = price.multiply(3);
        expect(result.amount).toBe(300);
      });

      it('should handle decimal factors', () => {
        const price = TicketPriceVO.inTND(100);
        const result = price.multiply(1.5);
        expect(result.amount).toBe(150);
      });

      it('should throw for negative factor', () => {
        const price = TicketPriceVO.inTND(100);
        expect(() => price.multiply(-1)).toThrow(InvalidPriceException);
      });
    });
  });

  describe('comparison methods', () => {
    describe('isGreaterThan', () => {
      it('should return true when price is greater', () => {
        const price1 = TicketPriceVO.inTND(100);
        const price2 = TicketPriceVO.inTND(50);
        expect(price1.isGreaterThan(price2)).toBe(true);
      });

      it('should return false when price is equal', () => {
        const price1 = TicketPriceVO.inTND(100);
        const price2 = TicketPriceVO.inTND(100);
        expect(price1.isGreaterThan(price2)).toBe(false);
      });

      it('should return false when price is less', () => {
        const price1 = TicketPriceVO.inTND(50);
        const price2 = TicketPriceVO.inTND(100);
        expect(price1.isGreaterThan(price2)).toBe(false);
      });

      it('should throw for different currencies', () => {
        const price1 = TicketPriceVO.inTND(100);
        const price2 = TicketPriceVO.inEUR(50);
        expect(() => price1.isGreaterThan(price2)).toThrow(InvalidPriceException);
      });
    });

    describe('isLessThan', () => {
      it('should return true when price is less', () => {
        const price1 = TicketPriceVO.inTND(50);
        const price2 = TicketPriceVO.inTND(100);
        expect(price1.isLessThan(price2)).toBe(true);
      });

      it('should return false when price is equal', () => {
        const price1 = TicketPriceVO.inTND(100);
        const price2 = TicketPriceVO.inTND(100);
        expect(price1.isLessThan(price2)).toBe(false);
      });

      it('should return false when price is greater', () => {
        const price1 = TicketPriceVO.inTND(100);
        const price2 = TicketPriceVO.inTND(50);
        expect(price1.isLessThan(price2)).toBe(false);
      });
    });

    describe('isEqualTo', () => {
      it('should return true for equal prices', () => {
        const price1 = TicketPriceVO.inTND(100);
        const price2 = TicketPriceVO.inTND(100);
        expect(price1.isEqualTo(price2)).toBe(true);
      });

      it('should return false for different amounts', () => {
        const price1 = TicketPriceVO.inTND(100);
        const price2 = TicketPriceVO.inTND(50);
        expect(price1.isEqualTo(price2)).toBe(false);
      });
    });
  });

  describe('percentage', () => {
    it('should calculate percentage of price', () => {
      const price = TicketPriceVO.inTND(100);
      const result = price.percentage(25);
      expect(result.amount).toBe(25);
    });

    it('should handle 100%', () => {
      const price = TicketPriceVO.inTND(100);
      const result = price.percentage(100);
      expect(result.amount).toBe(100);
    });

    it('should throw for percentage > 100', () => {
      const price = TicketPriceVO.inTND(100);
      expect(() => price.percentage(150)).toThrow(InvalidPriceException);
    });

    it('should throw for negative percentage', () => {
      const price = TicketPriceVO.inTND(100);
      expect(() => price.percentage(-10)).toThrow(InvalidPriceException);
    });
  });

  describe('applyDiscount', () => {
    it('should apply discount to price', () => {
      const price = TicketPriceVO.inTND(100);
      const result = price.applyDiscount(20);
      expect(result.amount).toBe(80);
    });

    it('should handle 0% discount', () => {
      const price = TicketPriceVO.inTND(100);
      const result = price.applyDiscount(0);
      expect(result.amount).toBe(100);
    });

    it('should throw for discount > 100%', () => {
      const price = TicketPriceVO.inTND(100);
      expect(() => price.applyDiscount(150)).toThrow(InvalidPriceException);
    });

    it('should throw for negative discount', () => {
      const price = TicketPriceVO.inTND(100);
      expect(() => price.applyDiscount(-10)).toThrow(InvalidPriceException);
    });
  });

  describe('toObject', () => {
    it('should return plain object', () => {
      const price = TicketPriceVO.inEUR(99.99);
      const obj = price.toObject();
      expect(obj).toEqual({
        amount: 99.99,
        currency: 'EUR',
      });
    });
  });

  describe('equals', () => {
    it('should return true for equal prices', () => {
      const price1 = TicketPriceVO.inTND(100);
      const price2 = TicketPriceVO.inTND(100);
      expect(price1.equals(price2)).toBe(true);
    });

    it('should return false for different amounts', () => {
      const price1 = TicketPriceVO.inTND(100);
      const price2 = TicketPriceVO.inTND(50);
      expect(price1.equals(price2)).toBe(false);
    });

    it('should return false for different currencies', () => {
      const price1 = TicketPriceVO.inTND(100);
      const price2 = TicketPriceVO.inEUR(100);
      expect(price1.equals(price2)).toBe(false);
    });
  });
});
