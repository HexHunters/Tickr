import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { EventStatus } from '../../../domain/value-objects/event-status.vo';

/**
 * Back-office query: number of events in each status
 */
export class GetEventStatusCountsQuery extends BaseQuery<Record<EventStatus, number>> {
  constructor() {
    super();
    Object.freeze(this);
  }
}
