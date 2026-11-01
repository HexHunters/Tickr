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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '@shared/infrastructure/common/decorators/current-user.decorator';
import { Roles } from '@shared/infrastructure/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@shared/infrastructure/common/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/infrastructure/common/guards/roles.guard';

import { RequestRefundCommand } from '../../application/commands/request-refund/request-refund.command';
import { RequestRefundHandler } from '../../application/commands/request-refund/request-refund.handler';
import type { PaginatedAdminOrdersDto } from '../../application/dtos/order.dto';
import type { OrderStatusSummary } from '../../application/ports/order.repository.port';
import { GetAdminOrdersHandler } from '../../application/queries/get-admin-orders/get-admin-orders.handler';
import { GetAdminOrdersQuery } from '../../application/queries/get-admin-orders/get-admin-orders.query';
import { GetOrderStatusSummaryHandler } from '../../application/queries/get-order-status-summary/get-order-status-summary.handler';
import { GetOrderStatusSummaryQuery } from '../../application/queries/get-order-status-summary/get-order-status-summary.query';

import { AdminOrdersQueryDto } from './dtos/admin-orders.dto';
import { RequestRefundRequestDto } from './dtos/request.dto';


/**
 * Back-office order supervision and refunds
 *
 * @route /api/admin/orders
 */
@ApiTags('Admin - Orders')
@ApiBearerAuth()
@Controller('admin/orders')
// Administrators page, filter and act in quick succession on the same route;
// the role guard already limits these routes to authenticated administrators.
@Throttle({
  short: { ttl: 1000, limit: 10 },
  medium: { ttl: 10000, limit: 80 },
  long: { ttl: 60000, limit: 300 },
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminOrdersController {
  constructor(
    private readonly getAdminOrdersHandler: GetAdminOrdersHandler,
    private readonly getOrderStatusSummaryHandler: GetOrderStatusSummaryHandler,
    private readonly requestRefundHandler: RequestRefundHandler,
  ) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Order counts and amounts per status (Admin only)' })
  @ApiResponse({ status: 200, description: 'One entry per order status' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async getStats(): Promise<OrderStatusSummary[]> {
    return this.getOrderStatusSummaryHandler.execute(new GetOrderStatusSummaryQuery());
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all orders (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated orders' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async listOrders(@Query() query: AdminOrdersQueryDto): Promise<PaginatedAdminOrdersDto> {
    return this.getAdminOrdersHandler.execute(
      new GetAdminOrdersQuery(
        { status: query.status, eventId: query.eventId, userId: query.userId },
        query.page ?? 1,
        query.limit ?? 20,
      ),
    );
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund any paid order (Admin only)' })
  @ApiResponse({ status: 200, description: 'Refund processed' })
  @ApiResponse({ status: 400, description: 'Refund not allowed or gateway error' })
  @ApiResponse({ status: 403, description: 'Admin role required or payment method disabled' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async refundOrder(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: RequestRefundRequestDto,
  ) {
    const result = await this.requestRefundHandler.execute(
      new RequestRefundCommand(orderId, user.userId, dto.reason, true),
    );

    if (result.isFailure) {
      const error = result.error;
      switch (error.type) {
        case 'ORDER_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'INVALID_STATUS':
        case 'REFUND_NOT_ALLOWED':
        case 'GATEWAY_ERROR':
          throw new BadRequestException(error.message);
        case 'PAYMENT_METHOD_DISABLED':
          throw new ForbiddenException({ code: error.type, message: error.message });
        case 'PERSISTENCE_ERROR':
          throw new InternalServerErrorException(error.message);
        default: {
          const _exhaustive: never = error;
          throw new BadRequestException('Unknown error');
        }
      }
    }

    return result.value;
  }
}
