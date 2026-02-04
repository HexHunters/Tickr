import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { Currency } from '../../../domain/value-objects/currency.vo';

import { EventOrmEntity } from './event.orm-entity';

/**
 * TicketType TypeORM Entity
 *
 * Maps to the events.ticket_types table in PostgreSQL.
 * This is the persistence model, separate from the domain model (TicketTypeEntity).
 *
 * Relationships:
 * - ManyToOne with EventOrmEntity (cascade delete from parent)
 *
 * @see TicketTypeEntity for domain logic
 */
@Entity({ name: 'ticket_types', schema: 'events' })
export class TicketTypeOrmEntity {
  // ============================================
  // Primary Key
  // ============================================

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ============================================
  // Foreign Key
  // ============================================

  @Column({ name: 'event_id', type: 'uuid' })
  @Index('idx_ticket_types_event')
  eventId!: string;

  // ============================================
  // Core Fields
  // ============================================

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // ============================================
  // Price Fields
  // ============================================

  @Column({ name: 'price_amount', type: 'decimal', precision: 10, scale: 3 })
  priceAmount!: number;

  @Column({ name: 'price_currency', type: 'varchar', length: 3, default: Currency.TND })
  priceCurrency!: Currency;

  // ============================================
  // Quantity Fields
  // ============================================

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ name: 'sold_quantity', type: 'integer', default: 0 })
  soldQuantity!: number;

  // ============================================
  // Sales Period Fields
  // ============================================

  @Column({ name: 'sales_start', type: 'timestamp' })
  salesStart!: Date;

  @Column({ name: 'sales_end', type: 'timestamp' })
  salesEnd!: Date;

  // ============================================
  // Status Fields
  // ============================================

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  // ============================================
  // Timestamps
  // ============================================

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  // ============================================
  // Relationships
  // ============================================

  @ManyToOne(() => EventOrmEntity, (event) => event.ticketTypes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'event_id' })
  event!: EventOrmEntity;
}
