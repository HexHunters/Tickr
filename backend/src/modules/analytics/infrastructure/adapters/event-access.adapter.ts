import { EVENT_REPOSITORY } from '@modules/events/application/ports/event.repository.port';
import type { EventRepositoryPort } from '@modules/events/application/ports/event.repository.port';
import { Inject, Injectable } from '@nestjs/common';

import type { EventAccessPort } from '../../application/ports/event-access.port';

@Injectable()
export class EventAccessAdapter implements EventAccessPort {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
  ) {}

  async findOrganizerId(eventId: string): Promise<string | null> {
    const event = await this.eventRepository.findById(eventId);
    return event?.organizerId ?? null;
  }
}