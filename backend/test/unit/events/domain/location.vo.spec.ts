import { LocationVO } from '@modules/events/domain/value-objects/location.vo';
import { InvalidLocationException } from '@modules/events/domain/exceptions/invalid-location.exception';

describe('Location Value Object', () => {
  describe('create', () => {
    it('should create a valid location with required fields', () => {
      const location = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
      });

      expect(location.city).toBe('Tunis');
      expect(location.country).toBe('Tunisia');
      expect(location.address).toBeNull();
      expect(location.postalCode).toBeNull();
      expect(location.latitude).toBeNull();
      expect(location.longitude).toBeNull();
    });

    it('should create a location with all fields', () => {
      const location = LocationVO.create({
        address: 'Avenue Habib Bourguiba',
        city: 'Tunis',
        country: 'Tunisia',
        postalCode: '1000',
        latitude: 36.8065,
        longitude: 10.1815,
      });

      expect(location.address).toBe('Avenue Habib Bourguiba');
      expect(location.city).toBe('Tunis');
      expect(location.country).toBe('Tunisia');
      expect(location.postalCode).toBe('1000');
      expect(location.latitude).toBe(36.8065);
      expect(location.longitude).toBe(10.1815);
    });

    it('should trim whitespace from fields', () => {
      const location = LocationVO.create({
        address: '  Avenue Bourguiba  ',
        city: '  Tunis  ',
        country: '  Tunisia  ',
      });

      expect(location.address).toBe('Avenue Bourguiba');
      expect(location.city).toBe('Tunis');
      expect(location.country).toBe('Tunisia');
    });

    it('should convert empty address to null', () => {
      const location = LocationVO.create({
        address: '   ',
        city: 'Tunis',
        country: 'Tunisia',
      });

      expect(location.address).toBeNull();
    });
  });

  describe('createTunisian', () => {
    it('should create a Tunisian location with country preset', () => {
      const location = LocationVO.createTunisian({
        city: 'Sousse',
        address: 'Port El Kantaoui',
      });

      expect(location.city).toBe('Sousse');
      expect(location.country).toBe('Tunisia');
      expect(location.address).toBe('Port El Kantaoui');
    });
  });

  describe('validation', () => {
    it('should throw when city is missing', () => {
      expect(() =>
        LocationVO.create({
          city: '',
          country: 'Tunisia',
        }),
      ).toThrow(InvalidLocationException);
    });

    it('should throw when country is missing', () => {
      expect(() =>
        LocationVO.create({
          city: 'Tunis',
          country: '',
        }),
      ).toThrow(InvalidLocationException);
    });

    it('should throw when city is too long', () => {
      expect(() =>
        LocationVO.create({
          city: 'A'.repeat(101),
          country: 'Tunisia',
        }),
      ).toThrow(InvalidLocationException);
    });

    it('should throw when country is too long', () => {
      expect(() =>
        LocationVO.create({
          city: 'Tunis',
          country: 'A'.repeat(101),
        }),
      ).toThrow(InvalidLocationException);
    });

    it('should throw when address is too long', () => {
      expect(() =>
        LocationVO.create({
          address: 'A'.repeat(501),
          city: 'Tunis',
          country: 'Tunisia',
        }),
      ).toThrow(InvalidLocationException);
    });

    describe('coordinate validation', () => {
      it('should throw when latitude is out of range (< -90)', () => {
        expect(() =>
          LocationVO.create({
            city: 'Tunis',
            country: 'Tunisia',
            latitude: -91,
            longitude: 10,
          }),
        ).toThrow(InvalidLocationException);
      });

      it('should throw when latitude is out of range (> 90)', () => {
        expect(() =>
          LocationVO.create({
            city: 'Tunis',
            country: 'Tunisia',
            latitude: 91,
            longitude: 10,
          }),
        ).toThrow(InvalidLocationException);
      });

      it('should throw when longitude is out of range (< -180)', () => {
        expect(() =>
          LocationVO.create({
            city: 'Tunis',
            country: 'Tunisia',
            latitude: 36,
            longitude: -181,
          }),
        ).toThrow(InvalidLocationException);
      });

      it('should throw when longitude is out of range (> 180)', () => {
        expect(() =>
          LocationVO.create({
            city: 'Tunis',
            country: 'Tunisia',
            latitude: 36,
            longitude: 181,
          }),
        ).toThrow(InvalidLocationException);
      });

      it('should throw when only latitude is provided', () => {
        expect(() =>
          LocationVO.create({
            city: 'Tunis',
            country: 'Tunisia',
            latitude: 36.8065,
          }),
        ).toThrow(InvalidLocationException);
      });

      it('should throw when only longitude is provided', () => {
        expect(() =>
          LocationVO.create({
            city: 'Tunis',
            country: 'Tunisia',
            longitude: 10.1815,
          }),
        ).toThrow(InvalidLocationException);
      });

      it('should accept edge case coordinates', () => {
        // North pole
        const northPole = LocationVO.create({
          city: 'North Pole',
          country: 'Arctic',
          latitude: 90,
          longitude: 0,
        });
        expect(northPole.latitude).toBe(90);

        // South pole
        const southPole = LocationVO.create({
          city: 'South Pole',
          country: 'Antarctica',
          latitude: -90,
          longitude: 0,
        });
        expect(southPole.latitude).toBe(-90);

        // Date line
        const dateLine = LocationVO.create({
          city: 'Date Line',
          country: 'Pacific',
          latitude: 0,
          longitude: 180,
        });
        expect(dateLine.longitude).toBe(180);
      });
    });
  });

  describe('hasCoordinates', () => {
    it('should return true when both coordinates are present', () => {
      const location = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
        latitude: 36.8065,
        longitude: 10.1815,
      });
      expect(location.hasCoordinates).toBe(true);
    });

    it('should return false when coordinates are missing', () => {
      const location = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
      });
      expect(location.hasCoordinates).toBe(false);
    });
  });

  describe('coordinates', () => {
    it('should return coordinates object when available', () => {
      const location = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
        latitude: 36.8065,
        longitude: 10.1815,
      });
      const coords = location.coordinates;
      expect(coords).toEqual({ latitude: 36.8065, longitude: 10.1815 });
    });

    it('should return null when coordinates are not available', () => {
      const location = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
      });
      expect(location.coordinates).toBeNull();
    });
  });

  describe('fullAddress', () => {
    it('should format full address with all parts', () => {
      const location = LocationVO.create({
        address: 'Avenue Bourguiba',
        city: 'Tunis',
        country: 'Tunisia',
        postalCode: '1000',
      });
      expect(location.fullAddress).toBe('Avenue Bourguiba, 1000 Tunis, Tunisia');
    });

    it('should format address without postal code', () => {
      const location = LocationVO.create({
        address: 'Avenue Bourguiba',
        city: 'Tunis',
        country: 'Tunisia',
      });
      expect(location.fullAddress).toBe('Avenue Bourguiba, Tunis, Tunisia');
    });

    it('should format address without street address', () => {
      const location = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
        postalCode: '1000',
      });
      expect(location.fullAddress).toBe('1000 Tunis, Tunisia');
    });

    it('should format minimal address', () => {
      const location = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
      });
      expect(location.fullAddress).toBe('Tunis, Tunisia');
    });
  });

  describe('shortLocation', () => {
    it('should return city and country', () => {
      const location = LocationVO.create({
        address: 'Avenue Bourguiba',
        city: 'Tunis',
        country: 'Tunisia',
      });
      expect(location.shortLocation).toBe('Tunis, Tunisia');
    });
  });

  describe('isTunisian', () => {
    it('should return true for Tunisia', () => {
      const location = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
      });
      expect(location.isTunisian()).toBe(true);
    });

    it('should return true for Tunisie (French)', () => {
      const location = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisie',
      });
      expect(location.isTunisian()).toBe(true);
    });

    it('should be case-insensitive', () => {
      const location = LocationVO.create({
        city: 'Tunis',
        country: 'TUNISIA',
      });
      expect(location.isTunisian()).toBe(true);
    });

    it('should return false for other countries', () => {
      const location = LocationVO.create({
        city: 'Paris',
        country: 'France',
      });
      expect(location.isTunisian()).toBe(false);
    });
  });

  describe('isKnownTunisianCity', () => {
    it('should return true for known Tunisian cities', () => {
      const tunis = LocationVO.createTunisian({ city: 'Tunis' });
      expect(tunis.isKnownTunisianCity()).toBe(true);

      const sousse = LocationVO.createTunisian({ city: 'Sousse' });
      expect(sousse.isKnownTunisianCity()).toBe(true);

      const sfax = LocationVO.createTunisian({ city: 'Sfax' });
      expect(sfax.isKnownTunisianCity()).toBe(true);
    });

    it('should be case-insensitive', () => {
      const location = LocationVO.createTunisian({ city: 'TUNIS' });
      expect(location.isKnownTunisianCity()).toBe(true);
    });

    it('should return false for unknown cities', () => {
      const location = LocationVO.createTunisian({ city: 'Unknown City' });
      expect(location.isKnownTunisianCity()).toBe(false);
    });

    it('should return false for non-Tunisian locations', () => {
      const location = LocationVO.create({
        city: 'Tunis',
        country: 'France',
      });
      expect(location.isKnownTunisianCity()).toBe(false);
    });
  });

  describe('distanceTo', () => {
    it('should calculate distance between two locations', () => {
      const tunis = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
        latitude: 36.8065,
        longitude: 10.1815,
      });

      const sousse = LocationVO.create({
        city: 'Sousse',
        country: 'Tunisia',
        latitude: 35.8254,
        longitude: 10.6369,
      });

      const distance = tunis.distanceTo(sousse);
      expect(distance).toBeDefined();
      expect(distance).toBeGreaterThan(100); // Approximately 120km
      expect(distance).toBeLessThan(150);
    });

    it('should return null when first location has no coordinates', () => {
      const tunis = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
      });

      const sousse = LocationVO.create({
        city: 'Sousse',
        country: 'Tunisia',
        latitude: 35.8254,
        longitude: 10.6369,
      });

      expect(tunis.distanceTo(sousse)).toBeNull();
    });

    it('should return null when second location has no coordinates', () => {
      const tunis = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
        latitude: 36.8065,
        longitude: 10.1815,
      });

      const sousse = LocationVO.create({
        city: 'Sousse',
        country: 'Tunisia',
      });

      expect(tunis.distanceTo(sousse)).toBeNull();
    });

    it('should return 0 for same location', () => {
      const location = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
        latitude: 36.8065,
        longitude: 10.1815,
      });

      expect(location.distanceTo(location)).toBe(0);
    });
  });

  describe('withCoordinates', () => {
    it('should create new location with coordinates', () => {
      const original = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
      });

      const withCoords = original.withCoordinates(36.8065, 10.1815);

      expect(withCoords.latitude).toBe(36.8065);
      expect(withCoords.longitude).toBe(10.1815);
      expect(withCoords.city).toBe('Tunis');
      expect(original.hasCoordinates).toBe(false);
    });
  });

  describe('withAddress', () => {
    it('should create new location with new address', () => {
      const original = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
      });

      const withAddress = original.withAddress('Avenue Bourguiba');

      expect(withAddress.address).toBe('Avenue Bourguiba');
      expect(withAddress.city).toBe('Tunis');
      expect(original.address).toBeNull();
    });
  });

  describe('getGoogleMapsUrl', () => {
    it('should return URL with coordinates when available', () => {
      const location = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
        latitude: 36.8065,
        longitude: 10.1815,
      });

      const url = location.getGoogleMapsUrl();
      expect(url).toBe('https://www.google.com/maps?q=36.8065,10.1815');
    });

    it('should return search URL when coordinates not available', () => {
      const location = LocationVO.create({
        address: 'Avenue Bourguiba',
        city: 'Tunis',
        country: 'Tunisia',
      });

      const url = location.getGoogleMapsUrl();
      expect(url).toContain('https://www.google.com/maps/search');
      expect(url).toContain('query=');
    });
  });

  describe('equals', () => {
    it('should return true for equal locations', () => {
      const location1 = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
        latitude: 36.8065,
        longitude: 10.1815,
      });

      const location2 = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
        latitude: 36.8065,
        longitude: 10.1815,
      });

      expect(location1.equals(location2)).toBe(true);
    });

    it('should return false for different locations', () => {
      const location1 = LocationVO.create({
        city: 'Tunis',
        country: 'Tunisia',
      });

      const location2 = LocationVO.create({
        city: 'Sousse',
        country: 'Tunisia',
      });

      expect(location1.equals(location2)).toBe(false);
    });
  });
});
