import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

import { OrderStatus } from '../../../domain/value-objects/order-status.vo';

/**
 * Query parameters for the back-office order list
 */
export class AdminOrdersQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  readonly status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Event UUID' })
  @IsOptional()
  @IsUUID()
  readonly eventId?: string;

  @ApiPropertyOptional({ description: 'Buyer user UUID' })
  @IsOptional()
  @IsUUID()
  readonly userId?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit?: number = 20;
}
