import { EventStatus } from '@modules/events/domain/value-objects/event-status.vo';
import { EventOrmEntity } from '@modules/events/infrastructure/persistence/entities/event.orm-entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';
import { RefundStatus } from '@modules/payments/domain/value-objects/refund-status.vo';
import { OrderOrmEntity } from '@modules/payments/infrastructure/persistence/entities/order.orm-entity';
import { RefundOrmEntity } from '@modules/payments/infrastructure/persistence/entities/refund.orm-entity';
import { Brackets } from 'typeorm';
import type { EntityManager } from 'typeorm';

import type {
  OrganizerObligationsInterface,
  OrganizerObligationsPort,
} from '../../application/ports/organizer-obligations.port';

/**
 * Organizer Obligations Adapter
 *
 * Anti-corruption layer reading the Events and Payments tables, read-only,
 * as the Tickets context does for orders. Bound to an EntityManager so the
 * check can run inside the administrative transaction that changes the role.
 */
export class OrganizerObligationsAdapter implements OrganizerObligationsPort {
  constructor(private readonly manager: EntityManager) {}

  async findOpenObligations(organizerId: string): Promise<OrganizerObligationsInterface> {
    const [openEvents, unsettledOrders, pendingRefunds] = await Promise.all([
      this.manager
        .createQueryBuilder(EventOrmEntity, 'event')
        .where('event.organizerId = :organizerId', { organizerId })
        .andWhere('event.status IN (:...open)', {
          open: [EventStatus.DRAFT, EventStatus.PUBLISHED],
        })
        .getCount(),
      this.manager
        .createQueryBuilder(OrderOrmEntity, 'ord')
        .innerJoin(EventOrmEntity, 'event', 'event.id = ord.eventId')
        .where('event.organizerId = :organizerId', { organizerId })
        .andWhere(
          new Brackets((owed) => {
            owed
              .where('ord.status IN (:...inFlight)', {
                inFlight: [OrderStatus.PENDING, OrderStatus.PROCESSING],
              })
              .orWhere('(ord.status = :paid AND event.status = :cancelled)', {
                paid: OrderStatus.PAID,
                cancelled: EventStatus.CANCELLED,
              });
          }),
        )
        .getCount(),
      this.manager
        .createQueryBuilder(RefundOrmEntity, 'refund')
        .innerJoin(OrderOrmEntity, 'ord', 'ord.id = refund.orderId')
        .innerJoin(EventOrmEntity, 'event', 'event.id = ord.eventId')
        .where('event.organizerId = :organizerId', { organizerId })
        .andWhere('refund.status = :pending', { pending: RefundStatus.PENDING })
        .getCount(),
    ]);

    return { openEvents, unsettledOrders, pendingRefunds };
  }
}
