import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { EventCategory } from '../../../domain/value-objects/event-category.vo';
import type { EventStatus } from '../../../domain/value-objects/event-status.vo';
import type { PaginatedAdminEventsDto } from '../../dtos/admin-event.dto';

/**
 * Back-office query: every event, any status, with filters
 */
export class GetAdminEventsQuery extends BaseQuery<PaginatedAdminEventsDto> {
  constructor(
    public readonly filters: {
      readonly status?: EventStatus;
      readonly category?: EventCategory;
      readonly organizerId?: string;
      readonly search?: string;
    },
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {
    super();
    Object.freeze(this);
  }
}
