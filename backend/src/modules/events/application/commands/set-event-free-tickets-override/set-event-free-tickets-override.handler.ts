import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';
import type { DomainEventPublisherPort } from '@shared/application/interfaces/domain-event-publisher.port';
import { Result } from '@shared/domain/result';

import { EVENT_REPOSITORY } from '../../ports/event.repository.port';
import type { EventRepositoryPort } from '../../ports/event.repository.port';
import { USER_VALIDATION_SERVICE } from '../../ports/user-validation.service.port';
import type { UserValidationServicePort } from '../../ports/user-validation.service.port';

import type {
  SetEventFreeTicketsOverrideCommand,
  EventFreeTicketsPolicy,
} from './set-event-free-tickets-override.command';

type PolicyError = {
  type:
    | 'ACCESS_DENIED'
    | 'EVENT_NOT_FOUND'
    | 'INVALID_POLICY'
    | 'PERSISTENCE_ERROR';
  message: string;
};

@Injectable()
export class SetEventFreeTicketsOverrideHandler {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly repository: EventRepositoryPort,
    @Inject(USER_VALIDATION_SERVICE)
    private readonly users: UserValidationServicePort,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly publisher: DomainEventPublisherPort,
    private readonly config: ConfigService,
  ) {}

  async execute(
    command: SetEventFreeTicketsOverrideCommand,
  ): Promise<Result<EventFreeTicketsPolicy, PolicyError>> {
    if (!(await this.users.isActiveAdmin(command.adminId))) {
      return Result.fail({
        type: 'ACCESS_DENIED',
        message: 'Only an administrator can configure free tickets',
      });
    }
    const event = await this.repository.findById(command.eventId);
    if (!event) {
      return Result.fail({
        type: 'EVENT_NOT_FOUND',
        message: 'Event not found',
      });
    }
    const updated = event.setFreeTicketsEnabledOverride(
      command.enabled,
      command.adminId,
    );
    if (updated.isFailure) {
      return Result.fail({
        type: 'INVALID_POLICY',
        message: updated.error.message,
      });
    }
    try {
      await this.repository.save(event);
      await this.publisher.publishFromAggregate(event);
    } catch {
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: 'Failed to configure free tickets',
      });
    }
    return Result.ok({
      eventId: event.id,
      freeTicketsEnabledOverride: event.freeTicketsEnabledOverride,
      effectiveFreeTicketsEnabled:
        event.freeTicketsEnabledOverride ??
        this.config.get<boolean>('payments.freeTickets.enabled', false),
    });
  }
}
