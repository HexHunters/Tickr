import { Injectable, Inject, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { EventStatus } from '../../../domain/value-objects/event-status.vo';
import { EVENT_REPOSITORY } from '../../ports/event.repository.port';
import type { EventRepositoryPort } from '../../ports/event.repository.port';

import type { CompleteEventError } from './complete-event.command';
import { CompleteEventCommand } from './complete-event.command';

// Re-export types
export type { CompleteEventError };

// ============================================
// Handler
// ============================================

/**
 * Handler for CompleteEventCommand
 *
 * Marks an event as completed after it has ended.
 *
 * Responsibilities:
 * 1. Validate event exists
 * 2. Validate event status is PUBLISHED
 * 3. Validate event has ended (end date < now)
 * 4. Call event.markAsCompleted()
 * 5. Save updated event
 */
@Injectable()
export class CompleteEventHandler {
  private readonly logger = new Logger(CompleteEventHandler.name);

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
  ) {}

  /**
   * Execute the complete event command
   */
  async execute(
    command: CompleteEventCommand,
  ): Promise<Result<void, CompleteEventError>> {
    this.logger.debug(`Completing event: ${command.eventId}`);

    // ============================================
    // 1. Validate event exists
    // ============================================
    const event = await this.eventRepository.findById(command.eventId);

    if (!event) {
      return Result.fail({
        type: 'EVENT_NOT_FOUND',
        message: `Event with id '${command.eventId}' not found`,
      });
    }

    // ============================================
    // 2. Validate event status is PUBLISHED
    // ============================================
    if (event.status !== EventStatus.PUBLISHED) {
      return Result.fail({
        type: 'INVALID_STATUS',
        message: `Event '${command.eventId}' is not published (current status: ${event.status}). Only published events can be completed.`,
      });
    }

    // ============================================
    // 3. Validate event has ended
    // ============================================
    if (!event.hasEnded()) {
      return Result.fail({
        type: 'EVENT_NOT_ENDED',
        message: `Event '${command.eventId}' has not ended yet. End date: ${event.dateRange.endDate.toISOString()}`,
      });
    }

    // ============================================
    // 4. Mark event as completed
    // ============================================
    event.markAsCompleted();

    // ============================================
    // 5. Save updated event
    // ============================================
    await this.eventRepository.save(event);

    this.logger.log(`Event ${command.eventId} marked as completed`);

    return Result.okVoid();
  }
}
