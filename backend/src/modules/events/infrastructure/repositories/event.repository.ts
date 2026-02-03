import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginatedResult } from '@shared/application/interfaces/repository.interface';
import { Repository, SelectQueryBuilder, Brackets } from 'typeorm';

import { EventEntity } from '../../domain/entities/event.entity';
import { EventCategory } from '../../domain/value-objects/event-category.vo';
import { EventStatus } from '../../domain/value-objects/event-status.vo';
import {
  EventRepositoryPort,
  EventFilters,
  EventPaginationOptions,
} from '../../application/ports/event.repository.port';
import { EventOrmEntity } from '../persistence/entities/event.orm-entity';
import { EventMapper } from '../persistence/mappers/event.mapper';

/**
 * Event TypeORM Repository
 *
 * Implements the EventRepositoryPort using TypeORM.
 * Provides all persistence operations for the Event aggregate.
 *
 * Key Features:
 * - QueryBuilder for complex queries
 * - Eager loading of ticket types when needed
 * - Full-text search using PostgreSQL trigram
 * - Efficient pagination
 * - N+1 query prevention
 */
@Injectable()
export class EventTypeOrmRepository implements EventRepositoryPort {
  private readonly logger = new Logger(EventTypeOrmRepository.name);

  constructor(
    @InjectRepository(EventOrmEntity)
    private readonly repository: Repository<EventOrmEntity>,
    private readonly mapper: EventMapper,
  ) {}

  // ============================================
  // Base CRUD Operations
  // ============================================

  /**
   * Find event by ID with ticket types
   */
  async findById(id: string): Promise<EventEntity | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['ticketTypes'],
    });

    if (!entity) {
      return null;
    }

    return this.mapper.toDomain(entity);
  }

  /**
   * Save event (create or update)
   * Handles cascading of ticket types
   */
  async save(domain: EventEntity): Promise<EventEntity> {
    const existingEntity = await this.repository.findOne({
      where: { id: domain.id },
      relations: ['ticketTypes'],
    });

    let entityToSave: EventOrmEntity;

    if (existingEntity) {
      // Update existing entity
      entityToSave = this.mapper.updatePersistence(existingEntity, domain);
    } else {
      // Create new entity
      entityToSave = this.mapper.toPersistence(domain);
    }

    const saved = await this.repository.save(entityToSave);

    // Reload with relations to get the complete entity
    const reloaded = await this.repository.findOne({
      where: { id: saved.id },
      relations: ['ticketTypes'],
    });

    return this.mapper.toDomain(reloaded!);
  }

  /**
   * Delete event by ID
   * Ticket types are cascade deleted
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Check if event exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Find events by organizer with pagination
   */
  async findByOrganizerId(
    organizerId: string,
    options?: EventPaginationOptions,
  ): Promise<PaginatedResult<EventEntity>> {
    const qb = this.repository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.ticketTypes', 'ticketTypes')
      .where('event.organizerId = :organizerId', { organizerId });

    return this.executePaginatedQuery(qb, options);
  }

  /**
   * Find published events with complex filters
   */
  async findPublished(
    filters?: EventFilters,
    options?: EventPaginationOptions,
  ): Promise<PaginatedResult<EventEntity>> {
    const qb = this.repository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.ticketTypes', 'ticketTypes')
      .where('event.status = :status', { status: EventStatus.PUBLISHED });

    this.applyFilters(qb, filters);

    return this.executePaginatedQuery(qb, options);
  }

  /**
   * Find events by category
   */
  async findByCategory(
    category: EventCategory,
    options?: EventPaginationOptions,
  ): Promise<PaginatedResult<EventEntity>> {
    const qb = this.repository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.ticketTypes', 'ticketTypes')
      .where('event.status = :status', { status: EventStatus.PUBLISHED })
      .andWhere('event.category = :category', { category });

    return this.executePaginatedQuery(qb, options);
  }

  /**
   * Search events by title using full-text search
   */
  async searchByTitle(
    query: string,
    options?: EventPaginationOptions,
  ): Promise<PaginatedResult<EventEntity>> {
    const searchTerm = `%${query.toLowerCase()}%`;

    const qb = this.repository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.ticketTypes', 'ticketTypes')
      .where('event.status = :status', { status: EventStatus.PUBLISHED })
      .andWhere('LOWER(event.title) LIKE :searchTerm', { searchTerm });

    // Add similarity scoring for better ranking
    qb.addSelect(
      `similarity(LOWER(event.title), LOWER(:rawQuery))`,
      'relevance',
    );
    qb.setParameter('rawQuery', query);

    // Sort by relevance by default for search
    const searchOptions = {
      ...options,
      sortBy: options?.sortBy ?? ('relevance' as any),
      sortOrder: options?.sortOrder ?? 'DESC',
    };

    return this.executePaginatedQuery(qb, searchOptions);
  }

  /**
   * Find upcoming events (future events, sorted by start date)
   */
  async findUpcoming(
    options?: EventPaginationOptions,
  ): Promise<PaginatedResult<EventEntity>> {
    const now = new Date();

    const qb = this.repository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.ticketTypes', 'ticketTypes')
      .where('event.status = :status', { status: EventStatus.PUBLISHED })
      .andWhere('event.startDate > :now', { now });

    // Default sort by start date ascending for upcoming events
    const upcomingOptions = {
      ...options,
      sortBy: options?.sortBy ?? 'startDate',
      sortOrder: options?.sortOrder ?? 'ASC',
    };

    return this.executePaginatedQuery(qb, upcomingOptions);
  }

  /**
   * Find events within a date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<EventEntity[]> {
    const entities = await this.repository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.ticketTypes', 'ticketTypes')
      .where(
        new Brackets((qb) => {
          // Event starts within range
          qb.where('event.startDate BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
          })
            // Or event ends within range
            .orWhere('event.endDate BETWEEN :startDate AND :endDate', {
              startDate,
              endDate,
            })
            // Or event spans the entire range
            .orWhere(
              'event.startDate <= :startDate AND event.endDate >= :endDate',
              { startDate, endDate },
            );
        }),
      )
      .getMany();

    return this.mapper.toDomainArray(entities);
  }

  /**
   * Find events ready for completion (ended events)
   */
  async findEventsToComplete(beforeDate: Date): Promise<EventEntity[]> {
    const entities = await this.repository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.ticketTypes', 'ticketTypes')
      .where('event.status = :status', { status: EventStatus.PUBLISHED })
      .andWhere('event.endDate < :beforeDate', { beforeDate })
      .getMany();

    return this.mapper.toDomainArray(entities);
  }

  // ============================================
  // Count Methods
  // ============================================

  /**
   * Count events by organizer
   */
  async countByOrganizer(organizerId: string, status?: EventStatus): Promise<number> {
    const qb = this.repository
      .createQueryBuilder('event')
      .where('event.organizerId = :organizerId', { organizerId });

    if (status) {
      qb.andWhere('event.status = :status', { status });
    }

    return qb.getCount();
  }

  /**
   * Count published events by category
   */
  async countByCategory(category: EventCategory): Promise<number> {
    return this.repository.count({
      where: {
        status: EventStatus.PUBLISHED,
        category,
      },
    });
  }

  /**
   * Count total published events
   */
  async countPublished(): Promise<number> {
    return this.repository.count({
      where: { status: EventStatus.PUBLISHED },
    });
  }

  // ============================================
  // Existence Checks
  // ============================================

  /**
   * Check if organizer has any events
   */
  async existsByOrganizer(organizerId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { organizerId },
    });
    return count > 0;
  }

  // ============================================
  // Slug Operations (Future Enhancement)
  // ============================================

  /**
   * Find event by slug (not implemented yet)
   */
  async findBySlug(slug: string): Promise<EventEntity | null> {
    // Slug field not yet added to schema
    // This is a placeholder for future implementation
    this.logger.warn('findBySlug not yet implemented');
    return null;
  }

  /**
   * Check if slug is available (not implemented yet)
   */
  async isSlugAvailable(slug: string, excludeEventId?: string): Promise<boolean> {
    // Slug field not yet added to schema
    this.logger.warn('isSlugAvailable not yet implemented');
    return true;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Apply filters to query builder
   */
  private applyFilters(
    qb: SelectQueryBuilder<EventOrmEntity>,
    filters?: EventFilters,
  ): void {
    if (!filters) return;

    if (filters.category) {
      qb.andWhere('event.category = :category', { category: filters.category });
    }

    if (filters.city) {
      qb.andWhere('LOWER(event.locationCity) LIKE LOWER(:city)', {
        city: `%${filters.city}%`,
      });
    }

    if (filters.country) {
      qb.andWhere('LOWER(event.locationCountry) LIKE LOWER(:country)', {
        country: `%${filters.country}%`,
      });
    }

    if (filters.dateFrom) {
      qb.andWhere('event.startDate >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere('event.startDate <= :dateTo', { dateTo: filters.dateTo });
    }

    if (filters.status) {
      qb.andWhere('event.status = :filterStatus', { filterStatus: filters.status });
    }

    if (filters.organizerId) {
      qb.andWhere('event.organizerId = :filterOrganizerId', {
        filterOrganizerId: filters.organizerId,
      });
    }

    if (filters.titleSearch) {
      qb.andWhere('LOWER(event.title) LIKE LOWER(:titleSearch)', {
        titleSearch: `%${filters.titleSearch}%`,
      });
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      // Join with ticket types to filter by price
      // Only include events that have at least one ticket type within the price range
      qb.andWhere(
        new Brackets((subQb) => {
          if (filters.minPrice !== undefined) {
            subQb.andWhere('ticketTypes.priceAmount >= :minPrice', {
              minPrice: filters.minPrice,
            });
          }
          if (filters.maxPrice !== undefined) {
            subQb.andWhere('ticketTypes.priceAmount <= :maxPrice', {
              maxPrice: filters.maxPrice,
            });
          }
        }),
      );
    }

    if (filters.hasAvailableTickets) {
      // Only events with at least one ticket type that has available tickets
      qb.andWhere('ticketTypes.soldQuantity < ticketTypes.quantity');
      qb.andWhere('ticketTypes.isActive = true');
    }
  }

  /**
   * Execute paginated query and return results
   */
  private async executePaginatedQuery(
    qb: SelectQueryBuilder<EventOrmEntity>,
    options?: EventPaginationOptions,
  ): Promise<PaginatedResult<EventEntity>> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    // Apply sorting
    const sortBy = options?.sortBy ?? 'createdAt';
    const sortOrder = options?.sortOrder ?? 'DESC';

    // Map sort field to column name
    const sortColumn = this.mapSortField(sortBy);
    qb.orderBy(sortColumn, sortOrder);

    // Execute count and data queries
    const [entities, total] = await qb
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data: this.mapper.toDomainArray(entities),
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Map sort field name to database column
   */
  private mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      createdAt: 'event.createdAt',
      updatedAt: 'event.updatedAt',
      startDate: 'event.startDate',
      endDate: 'event.endDate',
      title: 'event.title',
      totalCapacity: 'event.totalCapacity',
      soldTickets: 'event.soldTickets',
      publishedAt: 'event.publishedAt',
      relevance: 'relevance',
    };

    return fieldMap[field] ?? 'event.createdAt';
  }
}
