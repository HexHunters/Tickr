import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, LessThan, Repository } from 'typeorm';

import {
  OrderRepositoryPort,
  OrderSearchFilters,
  OrderStatusSummary,
} from '../../application/ports/order.repository.port';
import { OrderEntity } from '../../domain/entities/order.entity';
import { OrderStatus } from '../../domain/value-objects/order-status.vo';
import { OrderOrmEntity } from '../persistence/entities/order.orm-entity';
import { OrderMapper } from '../persistence/mappers/order.mapper';

/**
 * Order TypeORM Repository
 *
 * Implements OrderRepositoryPort using TypeORM.
 * All queries eagerly load order items.
 */
@Injectable()
export class OrderTypeOrmRepository implements OrderRepositoryPort {
  private readonly logger = new Logger(OrderTypeOrmRepository.name);

  constructor(
    @InjectRepository(OrderOrmEntity)
    private readonly repository: Repository<OrderOrmEntity>,
    private readonly mapper: OrderMapper,
  ) {}

  async save(order: OrderEntity): Promise<OrderEntity> {
    const existing = await this.repository.findOne({
      where: { id: order.id },
      relations: ['items'],
    });

    let entityToSave: OrderOrmEntity;

    if (existing) {
      entityToSave = this.mapper.updatePersistence(existing, order);
    } else {
      entityToSave = this.mapper.toPersistence(order);
    }

    const saved = await this.repository.save(entityToSave);

    const reloaded = await this.repository.findOne({
      where: { id: saved.id },
      relations: ['items'],
    });

    return this.mapper.toDomain(reloaded!);
  }

  async findById(id: string): Promise<OrderEntity | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!entity) {
      return null;
    }

    return this.mapper.toDomain(entity);
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: OrderEntity[]; total: number }> {
    const [entities, total] = await this.repository.findAndCount({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: this.mapper.toDomainArray(entities),
      total,
    };
  }

  async findByEventId(
    eventId: string,
    page: number,
    limit: number,
  ): Promise<{ data: OrderEntity[]; total: number }> {
    const [entities, total] = await this.repository.findAndCount({
      where: { eventId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: this.mapper.toDomainArray(entities),
      total,
    };
  }

  async findExpired(): Promise<OrderEntity[]> {
    const now = new Date();

    const entities = await this.repository.find({
      where: {
        status: OrderStatus.PENDING,
        expiresAt: LessThan(now),
      },
      relations: ['items'],
    });

    return this.mapper.toDomainArray(entities);
  }

  async countByUserIdSince(userId: string, since: Date): Promise<number> {
    return this.repository
      .createQueryBuilder('order')
      .where('order.user_id = :userId', { userId })
      .andWhere('order.created_at >= :since', { since })
      .getCount();
  }

  async findByGatewayPaymentRef(ref: string): Promise<OrderEntity | null> {
    const entity = await this.repository.findOne({
      where: { gatewayPaymentRef: ref },
      relations: ['items'],
    });

    if (!entity) {
      return null;
    }

    return this.mapper.toDomain(entity);
  }

  async findAll(
    filters: OrderSearchFilters,
    page: number,
    limit: number,
  ): Promise<{ data: OrderEntity[]; total: number }> {
    const where: FindOptionsWhere<OrderOrmEntity> = {};
    if (filters.status) where.status = filters.status;
    if (filters.eventId) where.eventId = filters.eventId;
    if (filters.userId) where.userId = filters.userId;

    const [entities, total] = await this.repository.findAndCount({
      where,
      relations: ['items'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: this.mapper.toDomainArray(entities),
      total,
    };
  }

  async getStatusSummary(): Promise<OrderStatusSummary[]> {
    const rows = await this.repository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalAmount')
      .addSelect('COALESCE(SUM(order.platformFeeAmount), 0)', 'platformFeeAmount')
      .groupBy('order.status')
      .getRawMany<{
        status: OrderStatus;
        count: string;
        totalAmount: string;
        platformFeeAmount: string;
      }>();

    return Object.values(OrderStatus).map((status) => {
      const row = rows.find((candidate) => candidate.status === status);
      return {
        status,
        count: Number(row?.count ?? 0),
        totalAmount: Number(row?.totalAmount ?? 0),
        platformFeeAmount: Number(row?.platformFeeAmount ?? 0),
      };
    });
  }
}
