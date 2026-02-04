import { Injectable } from '@nestjs/common';

import { TicketTypeEntity } from '../../../domain/entities/ticket-type.entity';
import { SalesPeriodVO } from '../../../domain/value-objects/sales-period.vo';
import { TicketPriceVO } from '../../../domain/value-objects/ticket-price.vo';
import { TicketTypeOrmEntity } from '../entities/ticket-type.orm-entity';

/**
 * Ticket Type Mapper
 *
 * Transforms between domain entities (TicketTypeEntity) and
 * persistence entities (TicketTypeOrmEntity).
 *
 * Responsibilities:
 * - Convert domain value objects to primitive columns
 * - Convert primitive columns to domain value objects
 * - Preserve all data during conversions
 */
@Injectable()
export class TicketTypeMapper {
  /**
   * Convert domain entity to persistence entity
   *
   * @param domain - Domain TicketTypeEntity
   * @returns TypeORM entity ready for persistence
   */
  toPersistence(domain: TicketTypeEntity): TicketTypeOrmEntity {
    const entity = new TicketTypeOrmEntity();

    entity.id = domain.id;
    entity.eventId = domain.eventId;
    entity.name = domain.name;
    entity.description = domain.description;
    entity.priceAmount = domain.price.amount;
    entity.priceCurrency = domain.price.currency;
    entity.quantity = domain.quantity;
    entity.soldQuantity = domain.soldQuantity;
    entity.salesStart = domain.salesPeriod.startDate;
    entity.salesEnd = domain.salesPeriod.endDate;
    entity.isActive = domain.isActive;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;

    return entity;
  }

  /**
   * Convert persistence entity to domain entity
   *
   * @param raw - TypeORM entity from database
   * @returns Domain TicketTypeEntity
   */
  toDomain(raw: TicketTypeOrmEntity): TicketTypeEntity {
    // Create value objects from primitive values
    const price = TicketPriceVO.create(
      Number(raw.priceAmount),
      raw.priceCurrency,
    );

    const salesPeriod = SalesPeriodVO.create(
      raw.salesStart,
      raw.salesEnd,
    );

    // Use reconstitute method to create entity from persisted data
    return TicketTypeEntity.reconstitute({
      id: raw.id,
      eventId: raw.eventId,
      name: raw.name,
      description: raw.description,
      price,
      quantity: raw.quantity,
      soldQuantity: raw.soldQuantity,
      salesPeriod,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  /**
   * Convert array of persistence entities to domain entities
   *
   * @param raws - Array of TypeORM entities
   * @returns Array of domain entities
   */
  toDomainArray(raws: TicketTypeOrmEntity[]): TicketTypeEntity[] {
    return raws.map((raw) => this.toDomain(raw));
  }

  /**
   * Convert array of domain entities to persistence entities
   *
   * @param domains - Array of domain entities
   * @returns Array of TypeORM entities
   */
  toPersistenceArray(domains: TicketTypeEntity[]): TicketTypeOrmEntity[] {
    return domains.map((domain) => this.toPersistence(domain));
  }
}
