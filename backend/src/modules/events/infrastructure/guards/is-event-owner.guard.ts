import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';

import { EVENT_REPOSITORY } from '../../application/ports/event.repository.port';
import type { EventRepositoryPort } from '../../application/ports/event.repository.port';

/**
 * Request user interface (from JWT payload)
 */
interface RequestUser {
  userId: string;
  email: string;
  role: string;
}

/**
 * Is Event Owner Guard
 *
 * Checks if the authenticated user is the owner (organizer) of the event.
 * Must be used after JwtAuthGuard to ensure user is attached to request.
 *
 * Features:
 * - Extracts event ID from route params (:id or :eventId)
 * - Fetches event from repository
 * - Compares event.organizerId with user.userId
 * - Throws 404 if event not found
 * - Throws 403 if user is not the owner
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, RolesGuard, IsEventOwnerGuard)
 * @Roles('ORGANIZER')
 * @Put(':id')
 * updateEvent(@Param('id') id: string, @Body() dto: UpdateEventDto) { ... }
 * ```
 */
@Injectable()
export class IsEventOwnerGuard implements CanActivate {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
  ) {}

  /**
   * Check if user owns the event
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;

    // No user attached (JwtAuthGuard should have run first)
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get event ID from route params
    // Supports both :id and :eventId patterns
    const eventId = request.params.id || request.params.eventId;

    if (!eventId) {
      throw new ForbiddenException('Event ID is required');
    }

    // Fetch event from repository
    const event = await this.eventRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException(`Event with id '${eventId}' not found`);
    }

    // Check ownership
    if (event.organizerId !== user.userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this event',
      );
    }

    // Attach event to request for reuse in handler (optional optimization)
    request.event = event;

    return true;
  }
}
