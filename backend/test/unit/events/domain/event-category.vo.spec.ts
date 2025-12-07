import {
  EventCategory,
  EventCategoryVO,
  EVENT_CATEGORY_METADATA,
} from '@modules/events/domain/value-objects/event-category.vo';
import { InvalidEventCategoryException } from '@modules/events/domain/exceptions/invalid-event-category.exception';

describe('EventCategory', () => {
  describe('EventCategory enum', () => {
    it('should have all required categories', () => {
      expect(EventCategory.CONCERT).toBe('CONCERT');
      expect(EventCategory.CONFERENCE).toBe('CONFERENCE');
      expect(EventCategory.SPORT).toBe('SPORT');
      expect(EventCategory.THEATER).toBe('THEATER');
      expect(EventCategory.WORKSHOP).toBe('WORKSHOP');
      expect(EventCategory.FESTIVAL).toBe('FESTIVAL');
      expect(EventCategory.EXHIBITION).toBe('EXHIBITION');
      expect(EventCategory.NETWORKING).toBe('NETWORKING');
      expect(EventCategory.COMEDY).toBe('COMEDY');
      expect(EventCategory.OTHER).toBe('OTHER');
    });

    it('should have exactly 10 categories', () => {
      expect(Object.keys(EventCategory)).toHaveLength(10);
    });
  });

  describe('EVENT_CATEGORY_METADATA', () => {
    it('should have metadata for all categories', () => {
      Object.values(EventCategory).forEach((category) => {
        const metadata = EVENT_CATEGORY_METADATA[category];
        expect(metadata).toBeDefined();
        expect(metadata.displayName).toBeDefined();
        expect(metadata.displayNameFr).toBeDefined();
        expect(metadata.description).toBeDefined();
        expect(metadata.icon).toBeDefined();
        expect(metadata.color).toBeDefined();
      });
    });

    it('should have valid color formats (hex)', () => {
      Object.values(EVENT_CATEGORY_METADATA).forEach((metadata) => {
        expect(metadata.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('EventCategoryVO', () => {
    describe('create', () => {
      it('should create from valid string', () => {
        const category = EventCategoryVO.create('CONCERT');
        expect(category.value).toBe(EventCategory.CONCERT);
      });

      it('should create from lowercase string (case insensitive)', () => {
        const category = EventCategoryVO.create('concert');
        expect(category.value).toBe(EventCategory.CONCERT);
      });

      it('should throw InvalidEventCategoryException for invalid category', () => {
        expect(() => EventCategoryVO.create('INVALID')).toThrow(InvalidEventCategoryException);
      });

      it('should throw with proper error message for invalid category', () => {
        expect(() => EventCategoryVO.create('INVALID')).toThrow(/Invalid category: INVALID/);
      });
    });

    describe('fromEnum', () => {
      it('should create from enum value', () => {
        const category = EventCategoryVO.fromEnum(EventCategory.SPORT);
        expect(category.value).toBe(EventCategory.SPORT);
      });
    });

    describe('getMetadata', () => {
      it('should return metadata for category', () => {
        const category = EventCategoryVO.fromEnum(EventCategory.CONCERT);
        const metadata = category.getMetadata();
        expect(metadata.displayName).toBe('Concert');
        expect(metadata.icon).toBe('music');
      });
    });

    describe('getDisplayName', () => {
      it('should return English display name by default', () => {
        const category = EventCategoryVO.fromEnum(EventCategory.CONFERENCE);
        expect(category.getDisplayName()).toBe('Conference');
      });

      it('should return French display name when locale is fr', () => {
        const category = EventCategoryVO.fromEnum(EventCategory.THEATER);
        expect(category.getDisplayName('fr')).toBe('Théâtre');
      });
    });

    describe('getIcon', () => {
      it('should return icon name', () => {
        const category = EventCategoryVO.fromEnum(EventCategory.SPORT);
        expect(category.getIcon()).toBe('trophy');
      });
    });

    describe('getColor', () => {
      it('should return color hex', () => {
        const category = EventCategoryVO.fromEnum(EventCategory.FESTIVAL);
        expect(category.getColor()).toBe('#F44336');
      });
    });

    describe('equals', () => {
      it('should return true for same categories', () => {
        const category1 = EventCategoryVO.fromEnum(EventCategory.CONCERT);
        const category2 = EventCategoryVO.fromEnum(EventCategory.CONCERT);
        expect(category1.equals(category2)).toBe(true);
      });

      it('should return false for different categories', () => {
        const category1 = EventCategoryVO.fromEnum(EventCategory.CONCERT);
        const category2 = EventCategoryVO.fromEnum(EventCategory.SPORT);
        expect(category1.equals(category2)).toBe(false);
      });

      it('should return false when comparing with undefined', () => {
        const category = EventCategoryVO.fromEnum(EventCategory.CONCERT);
        expect(category.equals(undefined)).toBe(false);
      });
    });

    describe('toString', () => {
      it('should return category string', () => {
        const category = EventCategoryVO.fromEnum(EventCategory.WORKSHOP);
        expect(category.toString()).toBe('WORKSHOP');
      });
    });

    describe('static getAllCategories', () => {
      it('should return all categories', () => {
        const categories = EventCategoryVO.getAllCategories();
        expect(categories).toHaveLength(10);
        expect(categories).toContain(EventCategory.CONCERT);
        expect(categories).toContain(EventCategory.OTHER);
      });
    });

    describe('static isValidCategory', () => {
      it('should return true for valid category', () => {
        expect(EventCategoryVO.isValidCategory('CONCERT')).toBe(true);
        expect(EventCategoryVO.isValidCategory('concert')).toBe(true);
      });

      it('should return false for invalid category', () => {
        expect(EventCategoryVO.isValidCategory('INVALID')).toBe(false);
      });
    });

    describe('static getMetadataFor', () => {
      it('should return metadata for enum value', () => {
        const metadata = EventCategoryVO.getMetadataFor(EventCategory.COMEDY);
        expect(metadata.displayName).toBe('Comedy');
        expect(metadata.icon).toBe('laugh');
      });
    });

    describe('static fromString', () => {
      it('should return EventCategoryVO for valid string', () => {
        const category = EventCategoryVO.fromString('NETWORKING');
        expect(category).not.toBeNull();
        expect(category!.value).toBe(EventCategory.NETWORKING);
      });

      it('should return null for invalid string', () => {
        const category = EventCategoryVO.fromString('INVALID');
        expect(category).toBeNull();
      });
    });
  });
});
