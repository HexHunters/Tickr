import { Test, TestingModule } from '@nestjs/testing';

import { EventCacheService } from '../../../../../src/modules/events/infrastructure/services/event-cache.service';
import { CacheService } from '../../../../../src/shared/infrastructure/cache/cache.service';
import { EventCategory } from '../../../../../src/modules/events/domain/value-objects/event-category.vo';
import { EventStatus } from '../../../../../src/modules/events/domain/value-objects/event-status.vo';
import { Currency } from '../../../../../src/modules/events/domain/value-objects/currency.vo';

import type { EventDto } from '../../../../../src/modules/events/application/dtos/event.dto';
import type { PaginatedEventListDto } from '../../../../../src/modules/events/application/dtos/event-list.dto';

// ============================================
// Mocks
// ============================================

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  invalidatePattern: jest.fn(),
};

// ============================================
// Test Data
// ============================================

const createMockEventDto = (overrides: Partial<EventDto> = {}): EventDto => ({
  id: 'event-123',
  title: 'Test Event',
  description: 'A test event description',
  category: EventCategory.CONCERT,
  startDate: new Date('2025-03-01T19:00:00Z'),
  endDate: new Date('2025-03-01T23:00:00Z'),
  status: EventStatus.PUBLISHED,
  imageUrl: 'https://example.com/image.jpg',
  location: {
    address: '123 Test St',
    city: 'Test City',
    country: 'Test Country',
    postalCode: '12345',
    latitude: 48.8566,
    longitude: 2.3522,
  },
  organizer: {
    id: 'org-123',
    firstName: 'Test',
    lastName: 'Organizer',
    displayName: 'Test Organizer',
  },
  ticketTypes: [
    {
      id: 'ticket-1',
      eventId: 'event-123',
      name: 'General Admission',
      description: 'Standard entry',
      priceAmount: 50,
      priceCurrency: Currency.EUR,
      quantity: 100,
      soldQuantity: 25,
      availableQuantity: 75,
      salesStartDate: new Date('2025-01-01'),
      salesEndDate: new Date('2025-02-28'),
      isActive: true,
      isSoldOut: false,
      isOnSale: true,
      salesProgress: 25,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
  ],
  totalCapacity: 100,
  soldTickets: 25,
  availableCapacity: 75,
  salesProgress: 25,
  revenueAmount: 1250,
  revenueCurrency: Currency.EUR,
  publishedAt: new Date('2025-01-15T10:00:00Z'),
  createdAt: new Date('2025-01-01T10:00:00Z'),
  updatedAt: new Date('2025-01-15T10:00:00Z'),
  cancelledAt: null,
  cancellationReason: null,
  isSoldOut: false,
  isOnSale: true,
  hasStarted: false,
  hasEnded: false,
  ...overrides,
});

const createMockPaginatedList = (
  overrides: Partial<PaginatedEventListDto> = {},
): PaginatedEventListDto => ({
  data: [],
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  ...overrides,
});

// ============================================
// Tests
// ============================================

describe('EventCacheService', () => {
  let service: EventCacheService;
  let cacheService: typeof mockCacheService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCacheService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<EventCacheService>(EventCacheService);
    cacheService = module.get(CacheService);
  });

  describe('Single Event Caching', () => {
    describe('getEvent', () => {
      it('should return cached event if exists', async () => {
        const mockEvent = createMockEventDto();
        cacheService.get.mockResolvedValue(mockEvent);

        const result = await service.getEvent('event-123');

        expect(result).toEqual(mockEvent);
        expect(cacheService.get).toHaveBeenCalledWith('events:event:event-123');
      });

      it('should return null if event not in cache', async () => {
        cacheService.get.mockResolvedValue(null);

        const result = await service.getEvent('non-existent');

        expect(result).toBeNull();
        expect(cacheService.get).toHaveBeenCalledWith('events:event:non-existent');
      });
    });

    describe('setEvent', () => {
      it('should cache event with correct TTL', async () => {
        const mockEvent = createMockEventDto();
        cacheService.set.mockResolvedValue(undefined);

        await service.setEvent('event-123', mockEvent);

        expect(cacheService.set).toHaveBeenCalledWith(
          'events:event:event-123',
          mockEvent,
          300, // EVENT_DETAIL TTL (5 minutes)
        );
      });
    });

    describe('invalidateEvent', () => {
      it('should delete event from cache', async () => {
        cacheService.delete.mockResolvedValue(undefined);

        await service.invalidateEvent('event-123');

        expect(cacheService.delete).toHaveBeenCalledWith('events:event:event-123');
      });
    });
  });

  describe('Published List Caching', () => {
    describe('getPublishedList', () => {
      it('should return cached published list', async () => {
        const mockList = createMockPaginatedList({ total: 10 });
        cacheService.get.mockResolvedValue(mockList);

        const result = await service.getPublishedList(1, 10);

        expect(result).toEqual(mockList);
        expect(cacheService.get).toHaveBeenCalledWith('events:published:p1:l10');
      });

      it('should include filters in cache key', async () => {
        cacheService.get.mockResolvedValue(null);

        await service.getPublishedList(2, 20, 'category=CONCERT');

        expect(cacheService.get).toHaveBeenCalledWith(
          'events:published:p2:l20:category=CONCERT',
        );
      });
    });

    describe('setPublishedList', () => {
      it('should cache list with correct TTL', async () => {
        const mockList = createMockPaginatedList();
        cacheService.set.mockResolvedValue(undefined);

        await service.setPublishedList(1, 10, mockList);

        expect(cacheService.set).toHaveBeenCalledWith(
          'events:published:p1:l10',
          mockList,
          60, // LIST TTL (1 minute)
        );
      });

      it('should include filters in cache key', async () => {
        const mockList = createMockPaginatedList();
        cacheService.set.mockResolvedValue(undefined);

        await service.setPublishedList(1, 10, mockList, 'city=Paris');

        expect(cacheService.set).toHaveBeenCalledWith(
          'events:published:p1:l10:city=Paris',
          mockList,
          60,
        );
      });
    });
  });

  describe('Category List Caching', () => {
    describe('getCategoryList', () => {
      it('should return cached category list', async () => {
        const mockList = createMockPaginatedList();
        cacheService.get.mockResolvedValue(mockList);

        const result = await service.getCategoryList('CONCERT', 1, 10);

        expect(result).toEqual(mockList);
        expect(cacheService.get).toHaveBeenCalledWith('events:category:p1:l10:CONCERT');
      });
    });

    describe('setCategoryList', () => {
      it('should cache category list with correct TTL', async () => {
        const mockList = createMockPaginatedList();
        cacheService.set.mockResolvedValue(undefined);

        await service.setCategoryList('CONCERT', 1, 10, mockList);

        expect(cacheService.set).toHaveBeenCalledWith(
          'events:category:p1:l10:CONCERT',
          mockList,
          60,
        );
      });
    });
  });

  describe('Organizer List Caching', () => {
    describe('getOrganizerList', () => {
      it('should return cached organizer list', async () => {
        const mockList = createMockPaginatedList();
        cacheService.get.mockResolvedValue(mockList);

        const result = await service.getOrganizerList('org-123', 1, 10);

        expect(result).toEqual(mockList);
        expect(cacheService.get).toHaveBeenCalledWith(
          'events:organizer:p1:l10:org-123',
        );
      });
    });

    describe('setOrganizerList', () => {
      it('should cache organizer list', async () => {
        const mockList = createMockPaginatedList();
        cacheService.set.mockResolvedValue(undefined);

        await service.setOrganizerList('org-123', 1, 10, mockList);

        expect(cacheService.set).toHaveBeenCalledWith(
          'events:organizer:p1:l10:org-123',
          mockList,
          60,
        );
      });
    });
  });

  describe('Upcoming List Caching', () => {
    describe('getUpcomingList', () => {
      it('should return cached upcoming list', async () => {
        const mockList = createMockPaginatedList();
        cacheService.get.mockResolvedValue(mockList);

        const result = await service.getUpcomingList(1, 10);

        expect(result).toEqual(mockList);
        expect(cacheService.get).toHaveBeenCalledWith('events:upcoming:p1:l10');
      });
    });

    describe('setUpcomingList', () => {
      it('should cache upcoming list', async () => {
        const mockList = createMockPaginatedList();
        cacheService.set.mockResolvedValue(undefined);

        await service.setUpcomingList(1, 10, mockList);

        expect(cacheService.set).toHaveBeenCalledWith(
          'events:upcoming:p1:l10',
          mockList,
          60,
        );
      });
    });
  });

  describe('Search Results Caching', () => {
    describe('getSearchResults', () => {
      it('should return cached search results', async () => {
        const mockList = createMockPaginatedList();
        cacheService.get.mockResolvedValue(mockList);

        const result = await service.getSearchResults({
          query: 'concert',
          page: 1,
          limit: 10,
        });

        expect(result).toEqual(mockList);
      });

      it('should generate consistent keys for same params in different order', async () => {
        cacheService.get.mockResolvedValue(null);

        // First call
        await service.getSearchResults({ z: '1', a: '2', m: '3' });
        const firstKey = cacheService.get.mock.calls[0][0];

        jest.clearAllMocks();

        // Second call with different param order
        await service.getSearchResults({ m: '3', z: '1', a: '2' });
        const secondKey = cacheService.get.mock.calls[0][0];

        // Keys should be identical (sorted)
        expect(firstKey).toBe(secondKey);
      });
    });

    describe('setSearchResults', () => {
      it('should cache search results with shorter TTL', async () => {
        const mockList = createMockPaginatedList();
        cacheService.set.mockResolvedValue(undefined);

        await service.setSearchResults({ query: 'test', page: 1 }, mockList);

        // Verify TTL is 30 seconds for search
        expect(cacheService.set).toHaveBeenCalledWith(
          expect.stringContaining('events:search:'),
          mockList,
          30,
        );
      });
    });
  });

  describe('Cache Invalidation', () => {
    describe('invalidateEventCaches', () => {
      it('should invalidate event and organizer list', async () => {
        cacheService.delete.mockResolvedValue(undefined);
        cacheService.invalidatePattern.mockResolvedValue(undefined);

        await service.invalidateEventCaches('event-123', 'org-456');

        expect(cacheService.delete).toHaveBeenCalledWith('events:event:event-123');
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
          'events:organizer:*:org-456',
        );
      });
    });

    describe('invalidatePublicCaches', () => {
      it('should invalidate all public cache patterns', async () => {
        cacheService.invalidatePattern.mockResolvedValue(undefined);

        await service.invalidatePublicCaches();

        expect(cacheService.invalidatePattern).toHaveBeenCalledTimes(4);
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
          'events:published:*',
        );
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
          'events:category:*',
        );
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
          'events:upcoming:*',
        );
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
          'events:search:*',
        );
      });
    });

    describe('invalidateAllForEvent', () => {
      it('should invalidate event caches and public caches', async () => {
        cacheService.delete.mockResolvedValue(undefined);
        cacheService.invalidatePattern.mockResolvedValue(undefined);

        await service.invalidateAllForEvent('event-123', 'org-456');

        // Should call both invalidation methods
        expect(cacheService.delete).toHaveBeenCalledWith('events:event:event-123');
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
          'events:organizer:*:org-456',
        );
        // Public caches (4 patterns)
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
          'events:published:*',
        );
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
          'events:category:*',
        );
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
          'events:upcoming:*',
        );
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
          'events:search:*',
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string filters gracefully', async () => {
      cacheService.get.mockResolvedValue(null);

      await service.getPublishedList(1, 10, '');

      // Empty filter should not add extra separator
      expect(cacheService.get).toHaveBeenCalledWith('events:published:p1:l10');
    });

    it('should handle special characters in search params', async () => {
      cacheService.get.mockResolvedValue(null);

      await service.getSearchResults({ query: 'rock & roll' });

      // Should work without errors
      expect(cacheService.get).toHaveBeenCalled();
    });
  });
});
