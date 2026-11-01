import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '@shared/infrastructure/common/decorators/current-user.decorator';
import { Roles } from '@shared/infrastructure/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@shared/infrastructure/common/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/infrastructure/common/guards/roles.guard';

import { CancelEventCommand } from '../../application/commands/cancel-event/cancel-event.command';
import { CancelEventHandler } from '../../application/commands/cancel-event/cancel-event.handler';
import type { PaginatedAdminEventsDto } from '../../application/dtos/admin-event.dto';
import { CancelEventDto } from '../../application/dtos/cancel-event.dto';
import { GetAdminEventsHandler } from '../../application/queries/get-admin-events/get-admin-events.handler';
import { GetAdminEventsQuery } from '../../application/queries/get-admin-events/get-admin-events.query';
import { GetEventStatusCountsHandler } from '../../application/queries/get-event-status-counts/get-event-status-counts.handler';
import { GetEventStatusCountsQuery } from '../../application/queries/get-event-status-counts/get-event-status-counts.query';
import type { EventStatus } from '../../domain/value-objects/event-status.vo';

import { AdminEventsQueryDto } from './dtos/admin-events.dto';


interface RequestUser {
  userId: string;
  email: string;
  role: string;
}

/**
 * Back-office event moderation
 *
 * Commission overrides stay on PATCH /api/events/:id/commission.
 *
 * @route /api/admin/events
 */
@ApiTags('Admin - Events')
@ApiBearerAuth()
@Controller('admin/events')
// Administrators page, filter and act in quick succession on the same route;
// the role guard already limits these routes to authenticated administrators.
@Throttle({
  short: { ttl: 1000, limit: 10 },
  medium: { ttl: 10000, limit: 80 },
  long: { ttl: 60000, limit: 300 },
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminEventsController {
  constructor(
    private readonly getAdminEventsHandler: GetAdminEventsHandler,
    private readonly getEventStatusCountsHandler: GetEventStatusCountsHandler,
    private readonly cancelEventHandler: CancelEventHandler,
  ) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Event counts by status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Counts keyed by status' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async getStats(): Promise<Record<EventStatus, number>> {
    return this.getEventStatusCountsHandler.execute(new GetEventStatusCountsQuery());
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all events, any status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated events' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async listEvents(@Query() query: AdminEventsQueryDto): Promise<PaginatedAdminEventsDto> {
    return this.getAdminEventsHandler.execute(
      new GetAdminEventsQuery(
        {
          status: query.status,
          category: query.category,
          organizerId: query.organizerId,
          search: query.search,
        },
        query.page ?? 1,
        query.limit ?? 20,
      ),
    );
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel any event (Admin only)' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiBody({ type: CancelEventDto })
  @ApiResponse({ status: 200, description: 'Event cancelled' })
  @ApiResponse({ status: 400, description: 'Event cannot be cancelled' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async cancelEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CancelEventDto,
  ): Promise<{ message: string }> {
    const result = await this.cancelEventHandler.execute(
      new CancelEventCommand(id, user.userId, dto.reason, true),
    );

    if (result.isFailure) {
      const error = result.error;
      switch (error.type) {
        case 'EVENT_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'NOT_OWNER':
          throw new ForbiddenException(error.message);
        case 'ALREADY_CANCELLED':
        case 'ALREADY_COMPLETED':
        case 'ALREADY_STARTED':
        case 'WRONG_STATUS':
          throw new BadRequestException(error.message);
        case 'MISSING_REASON':
        case 'VALIDATION_ERROR':
          throw new UnprocessableEntityException(error.message);
        case 'PERSISTENCE_ERROR':
          throw new InternalServerErrorException(error.message);
      }
    }

    return { message: 'Event cancelled successfully' };
  }
}
