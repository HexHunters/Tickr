import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PaginatedResult } from '@shared/application/interfaces/repository.interface';

import { ChangeUserRoleCommand } from '../../application/commands/change-user-role.command';
import { ChangeUserRoleHandler } from '../../application/commands/change-user-role.handler';
import { SetUserActiveStatusCommand } from '../../application/commands/set-user-active-status.command';
import { SetUserActiveStatusHandler } from '../../application/commands/set-user-active-status.handler';
import { UserProfileDto } from '../../application/dtos/user-profile.dto';
import { UserMapper } from '../../application/mappers/user.mapper';
import { USER_REPOSITORY } from '../../application/ports/user.repository.port';
import type { UserRepositoryPort, UserStats } from '../../application/ports/user.repository.port';
import { GetUserStatsHandler } from '../../application/queries/get-user-stats.handler';
import { GetUserStatsQuery } from '../../application/queries/get-user-stats.query';
import { SearchUsersHandler } from '../../application/queries/search-users.handler';
import { SearchUsersQuery } from '../../application/queries/search-users.query';
import { CurrentUser, Roles } from '../decorators/auth.decorators';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

import {
  AdminChangeUserRoleDto,
  AdminSetUserStatusDto,
  AdminUsersQueryDto,
} from './dtos/admin-users.dto';


type AdminUser = { userId: string; email: string; role: string };

/**
 * Back-office user management
 *
 * @route /api/admin/users
 */
@ApiTags('Admin - Users')
@ApiBearerAuth()
@Controller('admin/users')
// Administrators page, filter and act in quick succession on the same route;
// the role guard already limits these routes to authenticated administrators.
@Throttle({
  short: { ttl: 1000, limit: 10 },
  medium: { ttl: 10000, limit: 80 },
  long: { ttl: 60000, limit: 300 },
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    private readonly searchUsersHandler: SearchUsersHandler,
    private readonly getUserStatsHandler: GetUserStatsHandler,
    private readonly changeUserRoleHandler: ChangeUserRoleHandler,
    private readonly setUserActiveStatusHandler: SetUserActiveStatusHandler,
  ) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User counters by role and status (Admin only)' })
  @ApiResponse({ status: 200, description: 'User counters' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async getStats(): Promise<UserStats> {
    return this.getUserStatsHandler.execute(new GetUserStatsQuery());
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated users' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async searchUsers(
    @Query() query: AdminUsersQueryDto,
  ): Promise<PaginatedResult<UserProfileDto>> {
    return this.searchUsersHandler.execute(
      new SearchUsersQuery(
        {
          search: query.search,
          role: query.role,
          isActive: query.status === undefined ? undefined : query.status === 'active',
        },
        query.page ?? 1,
        query.limit ?? 20,
      ),
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id', ParseUUIDPipe) id: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return UserMapper.toProfileDto(user);
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change a user role (Admin only)' })
  @ApiResponse({ status: 200, description: 'Updated user profile' })
  @ApiResponse({ status: 403, description: 'Own account, or acting admin no longer active' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 409,
    description: 'LAST_ACTIVE_ADMIN, or ORGANIZER_HAS_OPEN_OBLIGATIONS with details.obligations counts',
  })
  async changeRole(
    @CurrentUser() admin: AdminUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminChangeUserRoleDto,
  ): Promise<UserProfileDto> {
    const result = await this.changeUserRoleHandler.execute(
      new ChangeUserRoleCommand(admin.userId, id, dto.role),
    );
    if (result.isFailure) {
      const error = result.error;
      switch (error.type) {
        case 'USER_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'ACTOR_NOT_AUTHORIZED':
        case 'SELF_MODIFICATION':
          throw new ForbiddenException({ code: error.type, message: error.message });
        case 'LAST_ACTIVE_ADMIN':
          throw new ConflictException({ code: error.type, message: error.message });
        case 'ORGANIZER_HAS_OPEN_OBLIGATIONS':
          throw new ConflictException({
            code: error.type,
            message: error.message,
            details: { obligations: error.obligations },
          });
        case 'PERSISTENCE_ERROR':
          throw new InternalServerErrorException(error.message);
      }
    }
    return result.value;
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend or reactivate a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'Updated user profile' })
  @ApiResponse({ status: 403, description: 'Own account, or acting admin no longer active' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'LAST_ACTIVE_ADMIN' })
  async setStatus(
    @CurrentUser() admin: AdminUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminSetUserStatusDto,
  ): Promise<UserProfileDto> {
    const result = await this.setUserActiveStatusHandler.execute(
      new SetUserActiveStatusCommand(admin.userId, id, dto.isActive),
    );
    if (result.isFailure) {
      const error = result.error;
      switch (error.type) {
        case 'USER_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'ACTOR_NOT_AUTHORIZED':
        case 'SELF_MODIFICATION':
          throw new ForbiddenException({ code: error.type, message: error.message });
        case 'LAST_ACTIVE_ADMIN':
          throw new ConflictException({ code: error.type, message: error.message });
        case 'PERSISTENCE_ERROR':
          throw new InternalServerErrorException(error.message);
      }
    }
    return result.value;
  }
}
