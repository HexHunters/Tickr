import { Inject, Injectable } from '@nestjs/common';

import type { EventStatus } from '../../../domain/value-objects/event-status.vo';
import { EVENT_REPOSITORY } from '../../ports/event.repository.port';
import type { EventRepositoryPort } from '../../ports/event.repository.port';

import { GetEventStatusCountsQuery } from './get-event-status-counts.query';


/**
 * Handler for GetEventStatusCountsQuery
 */
@Injectable()
export class GetEventStatusCountsHandler {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
  ) {}

  async execute(_query: GetEventStatusCountsQuery): Promise<Record<EventStatus, number>> {
    return this.eventRepository.countByStatus();
  }
}
