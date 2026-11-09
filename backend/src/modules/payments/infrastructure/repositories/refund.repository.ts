import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RefundRepositoryPort } from '../../application/ports/refund.repository.port';
import { RefundEntity } from '../../domain/entities/refund.entity';
import { RefundOrmEntity } from '../persistence/entities/refund.orm-entity';
import { RefundMapper } from '../persistence/mappers/refund.mapper';

/**
 * Refund TypeORM Repository
 *
 * Implements RefundRepositoryPort using TypeORM.
 */
@Injectable()
export class RefundTypeOrmRepository implements RefundRepositoryPort {
  constructor(
    @InjectRepository(RefundOrmEntity)
    private readonly repository: Repository<RefundOrmEntity>,
    private readonly mapper: RefundMapper,
  ) {}

  async save(refund: RefundEntity): Promise<RefundEntity> {
    const ormEntity = this.mapper.toPersistence(refund);
    const saved = await this.repository.save(ormEntity);
    return this.mapper.toDomain(saved);
  }

  async claim(refund: RefundEntity): Promise<boolean> {
    // Relies on the partial unique index UQ_refunds_order_open
    // (order_id WHERE status IN ('PENDING', 'COMPLETED')).
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(RefundOrmEntity)
      .values(this.mapper.toPersistence(refund))
      .orIgnore()
      .returning('id')
      .execute();
    return Array.isArray(result.raw) && result.raw.length > 0;
  }

  async findByOrderId(orderId: string): Promise<RefundEntity[]> {
    const entities = await this.repository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });

    return this.mapper.toDomainArray(entities);
  }
}
