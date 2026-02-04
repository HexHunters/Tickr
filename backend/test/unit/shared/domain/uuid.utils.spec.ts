/**
 * @file UUID Utilities Unit Tests
 * @description Tests for UUID validation utilities in the shared domain layer
 */

import { isUUID, isUUIDv4, assertUUID } from '@shared/domain/utils';

describe('UUID Utilities', () => {
  describe('isUUID()', () => {
    describe('Valid UUIDs', () => {
      it('should return true for valid UUID v4', () => {
        expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      });

      it('should return true for lowercase UUID', () => {
        expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      });

      it('should return true for uppercase UUID', () => {
        expect(isUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
      });

      it('should return true for mixed case UUID', () => {
        expect(isUUID('550e8400-E29B-41d4-A716-446655440000')).toBe(true);
      });

      it('should return true for UUID v1', () => {
        expect(isUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
      });

      it('should return true for nil UUID', () => {
        expect(isUUID('00000000-0000-0000-0000-000000000000')).toBe(true);
      });
    });

    describe('Invalid UUIDs', () => {
      it('should return false for empty string', () => {
        expect(isUUID('')).toBe(false);
      });

      it('should return false for null', () => {
        expect(isUUID(null as unknown as string)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(isUUID(undefined as unknown as string)).toBe(false);
      });

      it('should return false for random string', () => {
        expect(isUUID('invalid-uuid')).toBe(false);
      });

      it('should return false for UUID without dashes', () => {
        expect(isUUID('550e8400e29b41d4a716446655440000')).toBe(false);
      });

      it('should return false for UUID with extra characters', () => {
        expect(isUUID('550e8400-e29b-41d4-a716-446655440000x')).toBe(false);
      });

      it('should return false for UUID with invalid characters', () => {
        expect(isUUID('550e8400-e29b-41d4-a716-44665544000g')).toBe(false);
      });

      it('should return false for too short UUID', () => {
        expect(isUUID('550e8400-e29b-41d4-a716')).toBe(false);
      });

      it('should return false for number', () => {
        expect(isUUID(12345 as unknown as string)).toBe(false);
      });
    });
  });

  describe('isUUIDv4()', () => {
    describe('Valid UUID v4', () => {
      it('should return true for valid UUID v4', () => {
        expect(isUUIDv4('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      });

      it('should return true for UUID v4 with variant 8', () => {
        expect(isUUIDv4('550e8400-e29b-41d4-8716-446655440000')).toBe(true);
      });

      it('should return true for UUID v4 with variant 9', () => {
        expect(isUUIDv4('550e8400-e29b-41d4-9716-446655440000')).toBe(true);
      });

      it('should return true for UUID v4 with variant a', () => {
        expect(isUUIDv4('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      });

      it('should return true for UUID v4 with variant b', () => {
        expect(isUUIDv4('550e8400-e29b-41d4-b716-446655440000')).toBe(true);
      });
    });

    describe('Invalid UUID v4', () => {
      it('should return false for UUID v1', () => {
        expect(isUUIDv4('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(false);
      });

      it('should return false for UUID v3', () => {
        expect(isUUIDv4('6ba7b810-9dad-31d1-80b4-00c04fd430c8')).toBe(false);
      });

      it('should return false for UUID v5', () => {
        expect(isUUIDv4('6ba7b810-9dad-51d1-80b4-00c04fd430c8')).toBe(false);
      });

      it('should return false for UUID with invalid variant', () => {
        expect(isUUIDv4('550e8400-e29b-41d4-c716-446655440000')).toBe(false);
      });

      it('should return false for nil UUID', () => {
        expect(isUUIDv4('00000000-0000-0000-0000-000000000000')).toBe(false);
      });
    });
  });

  describe('assertUUID()', () => {
    it('should not throw for valid UUID', () => {
      expect(() => assertUUID('550e8400-e29b-41d4-a716-446655440000', 'userId')).not.toThrow();
    });

    it('should throw for invalid UUID', () => {
      expect(() => assertUUID('invalid', 'userId')).toThrow('userId must be a valid UUID');
    });

    it('should include field name in error message', () => {
      expect(() => assertUUID('invalid', 'organizerId')).toThrow('organizerId must be a valid UUID');
    });

    it('should throw for empty string', () => {
      expect(() => assertUUID('', 'eventId')).toThrow('eventId must be a valid UUID');
    });
  });
});
