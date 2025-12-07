import {
  Currency,
  CurrencyVO,
  CURRENCY_METADATA,
} from '@modules/events/domain/value-objects/currency.vo';

describe('Currency', () => {
  describe('Currency enum', () => {
    it('should have all required currencies', () => {
      expect(Currency.TND).toBe('TND');
      expect(Currency.EUR).toBe('EUR');
      expect(Currency.USD).toBe('USD');
    });

    it('should have exactly 3 currencies', () => {
      expect(Object.keys(Currency)).toHaveLength(3);
    });
  });

  describe('CURRENCY_METADATA', () => {
    it('should have metadata for all currencies', () => {
      Object.values(Currency).forEach((currency) => {
        const metadata = CURRENCY_METADATA[currency];
        expect(metadata).toBeDefined();
        expect(metadata.code).toBe(currency);
        expect(metadata.symbol).toBeDefined();
        expect(metadata.name).toBeDefined();
        expect(metadata.nameFr).toBeDefined();
        expect(metadata.decimals).toBeDefined();
        expect(metadata.locale).toBeDefined();
      });
    });

    it('should have TND with 3 decimal places', () => {
      expect(CURRENCY_METADATA[Currency.TND].decimals).toBe(3);
    });

    it('should have EUR and USD with 2 decimal places', () => {
      expect(CURRENCY_METADATA[Currency.EUR].decimals).toBe(2);
      expect(CURRENCY_METADATA[Currency.USD].decimals).toBe(2);
    });

    it('should have correct symbols', () => {
      expect(CURRENCY_METADATA[Currency.TND].symbol).toBe('DT');
      expect(CURRENCY_METADATA[Currency.EUR].symbol).toBe('€');
      expect(CURRENCY_METADATA[Currency.USD].symbol).toBe('$');
    });
  });

  describe('CurrencyVO', () => {
    describe('create', () => {
      it('should create from valid string', () => {
        const currency = CurrencyVO.create('TND');
        expect(currency.value).toBe(Currency.TND);
      });

      it('should create from lowercase string (case insensitive)', () => {
        const currency = CurrencyVO.create('eur');
        expect(currency.value).toBe(Currency.EUR);
      });

      it('should throw for invalid currency', () => {
        expect(() => CurrencyVO.create('INVALID')).toThrow();
      });
    });

    describe('fromEnum', () => {
      it('should create from enum value', () => {
        const currency = CurrencyVO.fromEnum(Currency.USD);
        expect(currency.value).toBe(Currency.USD);
      });
    });

    describe('default', () => {
      it('should return TND as default', () => {
        const currency = CurrencyVO.default();
        expect(currency.value).toBe(Currency.TND);
      });
    });

    describe('getMetadata', () => {
      it('should return metadata', () => {
        const currency = CurrencyVO.fromEnum(Currency.EUR);
        const metadata = currency.getMetadata();
        expect(metadata.symbol).toBe('€');
        expect(metadata.name).toBe('Euro');
      });
    });

    describe('getSymbol', () => {
      it('should return currency symbol', () => {
        expect(CurrencyVO.fromEnum(Currency.TND).getSymbol()).toBe('DT');
        expect(CurrencyVO.fromEnum(Currency.EUR).getSymbol()).toBe('€');
        expect(CurrencyVO.fromEnum(Currency.USD).getSymbol()).toBe('$');
      });
    });

    describe('getName', () => {
      it('should return English name by default', () => {
        const currency = CurrencyVO.fromEnum(Currency.TND);
        expect(currency.getName()).toBe('Tunisian Dinar');
      });

      it('should return French name when locale is fr', () => {
        const currency = CurrencyVO.fromEnum(Currency.TND);
        expect(currency.getName('fr')).toBe('Dinar Tunisien');
      });
    });

    describe('getDecimals', () => {
      it('should return decimal places', () => {
        expect(CurrencyVO.fromEnum(Currency.TND).getDecimals()).toBe(3);
        expect(CurrencyVO.fromEnum(Currency.EUR).getDecimals()).toBe(2);
      });
    });

    describe('format', () => {
      it('should format amount with currency', () => {
        const tnd = CurrencyVO.fromEnum(Currency.TND);
        const formatted = tnd.format(100);
        expect(formatted).toContain('100');
      });
    });

    describe('roundAmount', () => {
      it('should round to correct decimal places', () => {
        const tnd = CurrencyVO.fromEnum(Currency.TND);
        expect(tnd.roundAmount(10.12345)).toBe(10.123);

        const eur = CurrencyVO.fromEnum(Currency.EUR);
        expect(eur.roundAmount(10.126)).toBe(10.13);
      });
    });

    describe('currency checks', () => {
      it('isTND should return true only for TND', () => {
        expect(CurrencyVO.fromEnum(Currency.TND).isTND()).toBe(true);
        expect(CurrencyVO.fromEnum(Currency.EUR).isTND()).toBe(false);
      });

      it('isEUR should return true only for EUR', () => {
        expect(CurrencyVO.fromEnum(Currency.EUR).isEUR()).toBe(true);
        expect(CurrencyVO.fromEnum(Currency.TND).isEUR()).toBe(false);
      });

      it('isUSD should return true only for USD', () => {
        expect(CurrencyVO.fromEnum(Currency.USD).isUSD()).toBe(true);
        expect(CurrencyVO.fromEnum(Currency.TND).isUSD()).toBe(false);
      });
    });

    describe('equals', () => {
      it('should return true for same currencies', () => {
        const c1 = CurrencyVO.fromEnum(Currency.TND);
        const c2 = CurrencyVO.fromEnum(Currency.TND);
        expect(c1.equals(c2)).toBe(true);
      });

      it('should return false for different currencies', () => {
        const c1 = CurrencyVO.fromEnum(Currency.TND);
        const c2 = CurrencyVO.fromEnum(Currency.EUR);
        expect(c1.equals(c2)).toBe(false);
      });
    });

    describe('toString', () => {
      it('should return currency code', () => {
        expect(CurrencyVO.fromEnum(Currency.USD).toString()).toBe('USD');
      });
    });

    describe('static getAllCurrencies', () => {
      it('should return all currencies', () => {
        const currencies = CurrencyVO.getAllCurrencies();
        expect(currencies).toHaveLength(3);
        expect(currencies).toContain(Currency.TND);
        expect(currencies).toContain(Currency.EUR);
        expect(currencies).toContain(Currency.USD);
      });
    });

    describe('static isValidCurrency', () => {
      it('should return true for valid currency', () => {
        expect(CurrencyVO.isValidCurrency('TND')).toBe(true);
        expect(CurrencyVO.isValidCurrency('tnd')).toBe(true);
      });

      it('should return false for invalid currency', () => {
        expect(CurrencyVO.isValidCurrency('INVALID')).toBe(false);
      });
    });

    describe('static getSymbolFor', () => {
      it('should return symbol for currency', () => {
        expect(CurrencyVO.getSymbolFor(Currency.EUR)).toBe('€');
      });
    });

    describe('static formatAmount', () => {
      it('should format amount with currency', () => {
        const formatted = CurrencyVO.formatAmount(50, Currency.USD);
        expect(formatted).toContain('50');
      });
    });

    describe('static roundAmountFor', () => {
      it('should round amount for currency', () => {
        expect(CurrencyVO.roundAmountFor(10.999, Currency.EUR)).toBe(11);
      });
    });

    describe('static fromString', () => {
      it('should return CurrencyVO for valid string', () => {
        const currency = CurrencyVO.fromString('EUR');
        expect(currency).not.toBeNull();
        expect(currency!.value).toBe(Currency.EUR);
      });

      it('should return null for invalid string', () => {
        const currency = CurrencyVO.fromString('INVALID');
        expect(currency).toBeNull();
      });
    });

    describe('static getDefault', () => {
      it('should return TND', () => {
        expect(CurrencyVO.getDefault()).toBe(Currency.TND);
      });
    });
  });
});
