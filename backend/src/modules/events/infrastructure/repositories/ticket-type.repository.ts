import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TicketTypeRepositoryPort } from '../../application/ports/event.repository.port';
import { TicketTypeEntity } from '../../domain/entities/ticket-type.entity';
import { TicketTypeOrmEntity } from '../persistence/entities/ticket-type.orm-entity';
import { TicketTypeMapper } from '../persistence/mappers/ticket-type.mapper';

/**
 * TicketType TypeORM Repository
 *
 * Implements the TicketTypeRepositoryPort using TypeORM.
 * Provides specialized queries for ticket types.
 *
 * Note: Most ticket type operations go through EventRepository
 * since TicketType is a sub-entity of Event aggregate.
 * This repository is for specialized direct queries.
 */
@Injectable()
export class TicketTypeTypeOrmRepository implements TicketTypeRepositoryPort {
  private readonly logger = new Logger(TicketTypeTypeOrmRepository.name);

  constructor(
    @InjectRepository(TicketTypeOrmEntity)
    private readonly repository: Repository<TicketTypeOrmEntity>,
    private readonly mapper: TicketTypeMapper,
  ) {}

  /**
   * Find ticket type by ID
   */
  async findById(id: string): Promise<TicketTypeEntity | null> {
    const entity = await this.repository.findOne({
      where: { id },
    });

    if (!entity) {
      return null;
    }

    return this.mapper.toDomain(entity);
  }

  /**
   * Find all ticket types for an event
   */
  async findByEventId(
    eventId: string,
    activeOnly: boolean = false,
  ): Promise<TicketTypeEntity[]> {
    const where: any = { eventId };

    if (activeOnly) {
      where.isActive = true;
    }

    const entities = await this.repository.find({
      where,
      order: { createdAt: 'ASC' },
    });

    return this.mapper.toDomainArray(entities);
  }

  /**
   * Find ticket types currently on sale
   * - Must be active
   * - Must be within sales period
   * - Must not be sold out
   */
  async findOnSale(eventId: string): Promise<TicketTypeEntity[]> {
    const now = new Date();

    const entities = await this.repository
      .createQueryBuilder('ticketType')
      .where('ticketType.eventId = :eventId', { eventId })
      .andWhere('ticketType.isActive = true')
      .andWhere('ticketType.salesStart <= :now', { now })
      .andWhere('ticketType.salesEnd > :now', { now })
      .andWhere('ticketType.soldQuantity < ticketType.quantity')
      .orderBy('ticketType.priceAmount', 'ASC')
      .getMany();

    return this.mapper.toDomainArray(entities);
  }

  /**
   * Check if ticket type exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Find ticket types with available tickets for an event
   * Used for capacity checking
   */
  async findWithAvailableTickets(eventId: string): Promise<TicketTypeEntity[]> {
    const entities = await this.repository
      .createQueryBuilder('ticketType')
      .where('ticketType.eventId = :eventId', { eventId })
      .andWhere('ticketType.isActive = true')
      .andWhere('ticketType.soldQuantity < ticketType.quantity')
      .orderBy('ticketType.priceAmount', 'ASC')
      .getMany();

    return this.mapper.toDomainArray(entities);
  }

  /**
   * Get total sold quantity for an event
   */
  async getTotalSoldForEvent(eventId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('ticketType')
      .select('SUM(ticketType.soldQuantity)', 'total')
      .where('ticketType.eventId = :eventId', { eventId })
      .getRawOne();

    return Number(result?.total ?? 0);
  }

  /**
   * Get total capacity for an event
   */
  async getTotalCapacityForEvent(eventId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('ticketType')
      .select('SUM(ticketType.quantity)', 'total')
      .where('ticketType.eventId = :eventId', { eventId })
      .andWhere('ticketType.isActive = true')
      .getRawOne();

    return Number(result?.total ?? 0);
  }

  /**
   * Find ticket types by IDs
   * Used for batch operations
   */
  async findByIds(ids: string[]): Promise<TicketTypeEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const entities = await this.repository
      .createQueryBuilder('ticketType')
      .where('ticketType.id IN (:...ids)', { ids })
      .getMany();

    return this.mapper.toDomainArray(entities);
  }
}
