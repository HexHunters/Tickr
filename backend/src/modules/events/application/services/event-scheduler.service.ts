import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

import { EVENT_REPOSITORY } from '../ports/event.repository.port';
import { CompleteEventCommand } from '../commands/complete-event/complete-event.command';
import { CompleteEventHandler } from '../commands/complete-event/complete-event.handler';

import type { EventRepositoryPort } from '../ports/event.repository.port';

// ============================================
// Scheduler Service
// ============================================

/**
 * Event Scheduler Service
 *
 * Handles scheduled background tasks for the Events module.
 *
 * Scheduled Jobs:
 * 1. Complete Ended Events - Daily at midnight (0 0 * * *)
 *    - Finds all PUBLISHED events where end_date < now
 *    - Marks them as COMPLETED
 *
 * Design Considerations:
 * - Individual event failures don't stop the batch
 * - Comprehensive logging for monitoring
 * - Configurable via environment variables
 * - Can be manually triggered for testing
 */
@Injectable()
export class EventSchedulerService {
  private readonly logger = new Logger(EventSchedulerService.name);
  private readonly isEnabled: boolean;

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    private readonly completeEventHandler: CompleteEventHandler,
    private readonly configService: ConfigService,
  ) {
    // Allow disabling scheduler via environment variable
    this.isEnabled = this.configService.get<boolean>(
      'scheduler.events.enabled',
      true,
    );

    if (!this.isEnabled) {
      this.logger.warn('Event scheduler is DISABLED via configuration');
    } else {
      this.logger.log('Event scheduler initialized');
    }
  }

  // ============================================
  // Scheduled Jobs
  // ============================================

  /**
   * Complete all ended events
   *
   * Runs daily at midnight (00:00).
   * Finds all PUBLISHED events that have ended and marks them as COMPLETED.
   *
   * Cron: 0 0 * * * (every day at midnight)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'complete-ended-events',
    timeZone: 'UTC',
  })
  async completeEndedEvents(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug('Scheduler disabled, skipping completeEndedEvents');
      return;
    }

    this.logger.log('Starting scheduled job: Complete ended events');
    const startTime = Date.now();

    try {
      const result = await this.processEndedEvents();
      const duration = Date.now() - startTime;

      this.logger.log(
        `Completed scheduled job in ${duration}ms: ` +
          `${result.processed} events processed, ` +
          `${result.succeeded} succeeded, ` +
          `${result.failed} failed`,
      );
    } catch (error) {
      this.logger.error(
        'Scheduled job failed: completeEndedEvents',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  // ============================================
  // Processing Methods
  // ============================================

  /**
   * Process all events that have ended
   *
   * This method can be called manually for testing.
   *
   * @returns Statistics about processed events
   */
  async processEndedEvents(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: Array<{ eventId: string; error: string }>;
  }> {
    const now = new Date();
    this.logger.debug(`Finding events to complete before: ${now.toISOString()}`);

    // Find events ready for completion
    const events = await this.eventRepository.findEventsToComplete(now);
    this.logger.debug(`Found ${events.length} events to complete`);

    if (events.length === 0) {
      return {
        processed: 0,
        succeeded: 0,
        failed: 0,
        errors: [],
      };
    }

    const errors: Array<{ eventId: string; error: string }> = [];
    let succeeded = 0;

    // Process each event individually
    for (const event of events) {
      try {
        const command = new CompleteEventCommand(event.id);
        const result = await this.completeEventHandler.execute(command);

        if (result.isSuccess) {
          succeeded++;
          this.logger.debug(`Successfully completed event: ${event.id}`);
        } else {
          const error = result.error;
          errors.push({ eventId: event.id, error: error.message });
          this.logger.warn(
            `Failed to complete event ${event.id}: ${error.type} - ${error.message}`,
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push({ eventId: event.id, error: errorMessage });
        this.logger.error(
          `Exception while completing event ${event.id}: ${errorMessage}`,
        );
      }
    }

    return {
      processed: events.length,
      succeeded,
      failed: errors.length,
      errors,
    };
  }

  // ============================================
  // Manual Trigger Methods
  // ============================================

  /**
   * Manually trigger the complete ended events job
   *
   * Useful for testing or admin operations.
   * Bypasses the enabled check.
   */
  async triggerCompleteEndedEvents(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: Array<{ eventId: string; error: string }>;
  }> {
    this.logger.log('Manually triggered: Complete ended events');
    return this.processEndedEvents();
  }
}
