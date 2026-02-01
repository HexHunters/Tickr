/**
 * @file TicketTypeMapper Unit Tests
 * @description Tests for TicketTypeMapper conversion methods
 */

import { TicketTypeMapper } from '@modules/events/infrastructure/persistence/mappers/ticket-type.mapper';
import { TicketTypeOrmEntity } from '@modules/events/infrastructure/persistence/entities/ticket-type.orm-entity';
import { TicketTypeEntity } from '@modules/events/domain/entities/ticket-type.entity';
import { TicketPriceVO } from '@modules/events/domain/value-objects/ticket-price.vo';
import { SalesPeriodVO } from '@modules/events/domain/value-objects/sales-period.vo';
import { Currency } from '@modules/events/domain/value-objects/currency.vo';

describe('TicketTypeMapper', () => {
  let mapper: TicketTypeMapper;

  beforeEach(() => {
    mapper = new TicketTypeMapper();
  });

  // Helper to create a test ORM entity
  const createOrmEntity = (overrides: Partial<TicketTypeOrmEntity> = {}): TicketTypeOrmEntity => {
    const entity = new TicketTypeOrmEntity();
    entity.id = 'tt-123';
    entity.eventId = 'evt-456';
    entity.name = 'VIP Ticket';
    entity.description = 'Premium access';
    entity.priceAmount = 150.5;
    entity.priceCurrency = Currency.TND;
    entity.quantity = 100;
    entity.soldQuantity = 25;
    entity.salesStart = new Date('2026-06-01T00:00:00Z');
    entity.salesEnd = new Date('2026-07-14T23:59:59Z');
    entity.isActive = true;
    entity.createdAt = new Date('2026-05-01T10:00:00Z');
    entity.updatedAt = new Date('2026-05-15T15:30:00Z');
    return Object.assign(entity, overrides);
  };

  // Helper to create a test domain entity
  const createDomainEntity = (): TicketTypeEntity => {
    const result = TicketTypeEntity.create({
      id: 'tt-789',
      eventId: 'evt-101',
      name: 'Standard Ticket',
      description: 'General admission',
      price: TicketPriceVO.create(50, Currency.EUR),
      quantity: 200,
      salesPeriod: SalesPeriodVO.create(
        new Date('2026-06-01T00:00:00Z'),
        new Date('2026-07-31T23:59:59Z'),
      ),
    });
    return result.value;
  };

  describe('toDomain', () => {
    it('should convert ORM entity to domain entity', () => {
      const ormEntity = createOrmEntity();

      const domain = mapper.toDomain(ormEntity);

      expect(domain.id).toBe(ormEntity.id);
      expect(domain.eventId).toBe(ormEntity.eventId);
      expect(domain.name).toBe(ormEntity.name);
      expect(domain.description).toBe(ormEntity.description);
      expect(domain.price.amount).toBe(ormEntity.priceAmount);
      expect(domain.price.currency).toBe(ormEntity.priceCurrency);
      expect(domain.quantity).toBe(ormEntity.quantity);
      expect(domain.soldQuantity).toBe(ormEntity.soldQuantity);
      expect(domain.salesPeriod.startDate).toEqual(ormEntity.salesStart);
      expect(domain.salesPeriod.endDate).toEqual(ormEntity.salesEnd);
      expect(domain.isActive).toBe(ormEntity.isActive);
    });

    it('should handle null description', () => {
      const ormEntity = createOrmEntity({ description: null });

      const domain = mapper.toDomain(ormEntity);

      expect(domain.description).toBeNull();
    });

    it('should convert price amount from string to number', () => {
      const ormEntity = createOrmEntity();
      // TypeORM may return decimal as string
      (ormEntity as any).priceAmount = '99.99';

      const domain = mapper.toDomain(ormEntity);

      expect(domain.price.amount).toBe(99.99);
      expect(typeof domain.price.amount).toBe('number');
    });
  });

  describe('toPersistence', () => {
    it('should convert domain entity to ORM entity', () => {
      const domain = createDomainEntity();

      const ormEntity = mapper.toPersistence(domain);

      expect(ormEntity.id).toBe(domain.id);
      expect(ormEntity.eventId).toBe(domain.eventId);
      expect(ormEntity.name).toBe(domain.name);
      expect(ormEntity.description).toBe(domain.description);
      expect(ormEntity.priceAmount).toBe(domain.price.amount);
      expect(ormEntity.priceCurrency).toBe(domain.price.currency);
      expect(ormEntity.quantity).toBe(domain.quantity);
      expect(ormEntity.soldQuantity).toBe(domain.soldQuantity);
      expect(ormEntity.salesStart).toEqual(domain.salesPeriod.startDate);
      expect(ormEntity.salesEnd).toEqual(domain.salesPeriod.endDate);
      expect(ormEntity.isActive).toBe(domain.isActive);
    });

    it('should preserve timestamps', () => {
      const domain = createDomainEntity();

      const ormEntity = mapper.toPersistence(domain);

      expect(ormEntity.createdAt).toEqual(domain.createdAt);
      expect(ormEntity.updatedAt).toEqual(domain.updatedAt);
    });
  });

  describe('toDomainArray', () => {
    it('should convert array of ORM entities to domain entities', () => {
      const ormEntities = [
        createOrmEntity({ id: 'tt-1', name: 'Ticket 1' }),
        createOrmEntity({ id: 'tt-2', name: 'Ticket 2' }),
        createOrmEntity({ id: 'tt-3', name: 'Ticket 3' }),
      ];

      const domains = mapper.toDomainArray(ormEntities);

      expect(domains).toHaveLength(3);
      expect(domains[0].id).toBe('tt-1');
      expect(domains[1].id).toBe('tt-2');
      expect(domains[2].id).toBe('tt-3');
    });

    it('should return empty array for empty input', () => {
      const domains = mapper.toDomainArray([]);

      expect(domains).toHaveLength(0);
    });
  });

  describe('toPersistenceArray', () => {
    it('should convert array of domain entities to ORM entities', () => {
      const domain1 = createDomainEntity();
      const domain2 = TicketTypeEntity.create({
        eventId: 'evt-102',
        name: 'VIP',
        price: TicketPriceVO.create(100, Currency.TND),
        quantity: 50,
        salesPeriod: SalesPeriodVO.create(
          new Date('2026-06-01T00:00:00Z'),
          new Date('2026-07-31T23:59:59Z'),
        ),
      }).value;

      const ormEntities = mapper.toPersistenceArray([domain1, domain2]);

      expect(ormEntities).toHaveLength(2);
      expect(ormEntities[0].name).toBe('Standard Ticket');
      expect(ormEntities[1].name).toBe('VIP');
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve data through domain -> persistence -> domain', () => {
      const originalDomain = createDomainEntity();

      const persistence = mapper.toPersistence(originalDomain);
      const restoredDomain = mapper.toDomain(persistence);

      expect(restoredDomain.id).toBe(originalDomain.id);
      expect(restoredDomain.eventId).toBe(originalDomain.eventId);
      expect(restoredDomain.name).toBe(originalDomain.name);
      expect(restoredDomain.description).toBe(originalDomain.description);
      expect(restoredDomain.price.amount).toBe(originalDomain.price.amount);
      expect(restoredDomain.price.currency).toBe(originalDomain.price.currency);
      expect(restoredDomain.quantity).toBe(originalDomain.quantity);
      expect(restoredDomain.soldQuantity).toBe(originalDomain.soldQuantity);
      expect(restoredDomain.isActive).toBe(originalDomain.isActive);
    });

    it('should preserve data through persistence -> domain -> persistence', () => {
      const originalOrm = createOrmEntity();

      const domain = mapper.toDomain(originalOrm);
      const restoredOrm = mapper.toPersistence(domain);

      expect(restoredOrm.id).toBe(originalOrm.id);
      expect(restoredOrm.eventId).toBe(originalOrm.eventId);
      expect(restoredOrm.name).toBe(originalOrm.name);
      expect(restoredOrm.priceAmount).toBe(originalOrm.priceAmount);
      expect(restoredOrm.quantity).toBe(originalOrm.quantity);
    });
  });
});
