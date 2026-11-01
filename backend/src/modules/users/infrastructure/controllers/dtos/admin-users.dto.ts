import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { UserRole } from '../../../domain/value-objects/user-role.vo';

/**
 * Query parameters for the back-office user list
 */
export class AdminUsersQueryDto {
  @ApiPropertyOptional({ description: 'Search in email, first and last name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  readonly role?: UserRole;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  readonly status?: 'active' | 'inactive';

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

/**
 * Body for changing a user's role
 */
export class AdminChangeUserRoleDto {
  @ApiProperty({ enum: UserRole, example: UserRole.ORGANIZER })
  @IsEnum(UserRole)
  readonly role!: UserRole;
}

/**
 * Body for suspending or reactivating a user
 */
export class AdminSetUserStatusDto {
  @ApiProperty({ example: false })
  // Validate the raw JSON value: implicit conversion would turn any string,
  // including "false", into true.
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.isActive)
  @IsBoolean()
  readonly isActive!: boolean;
}
