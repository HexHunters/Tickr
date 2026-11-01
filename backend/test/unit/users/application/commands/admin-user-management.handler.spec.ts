import { ChangeUserRoleCommand } from '@modules/users/application/commands/change-user-role.command';
import { ChangeUserRoleHandler } from '@modules/users/application/commands/change-user-role.handler';
import { SetUserActiveStatusCommand } from '@modules/users/application/commands/set-user-active-status.command';
import { SetUserActiveStatusHandler } from '@modules/users/application/commands/set-user-active-status.handler';
import { UserRepositoryPort, UserEntityPort } from '@modules/users/application/ports/user.repository.port';
import { SearchUsersHandler } from '@modules/users/application/queries/search-users.handler';
import { SearchUsersQuery } from '@modules/users/application/queries/search-users.query';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';
import { Logger } from '@nestjs/common';

describe('Back-office user management', () => {
  let mockRepository: jest.Mocked<UserRepositoryPort>;

  const adminId = 'admin-1';
  const user: UserEntityPort = {
    id: 'user-123',
    email: 'amal@example.com',
    firstName: 'Amal',
    lastName: 'Ben Salah',
    role: UserRole.PARTICIPANT,
    phone: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByIds: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findByRole: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      existsByEmail: jest.fn(),
      countByRole: jest.fn(),
      findActiveUsers: jest.fn(),
      updateLastLogin: jest.fn(),
      updateEmailVerified: jest.fn(),
      updatePassword: jest.fn(),
      search: jest.fn(),
      getStats: jest.fn(),
      updateRole: jest.fn(),
      updateActiveStatus: jest.fn(),
    };
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  describe('ChangeUserRoleHandler', () => {
    let handler: ChangeUserRoleHandler;

    beforeEach(() => {
      handler = new ChangeUserRoleHandler(mockRepository);
    });

    it('promotes a participant to organizer', async () => {
      mockRepository.findById
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({ ...user, role: UserRole.ORGANIZER });

      const result = await handler.execute(
        new ChangeUserRoleCommand(adminId, user.id, UserRole.ORGANIZER),
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value.role).toBe(UserRole.ORGANIZER);
      expect(mockRepository.updateRole).toHaveBeenCalledWith(user.id, UserRole.ORGANIZER);
    });

    it('does not write when the role is unchanged', async () => {
      mockRepository.findById.mockResolvedValue(user);

      const result = await handler.execute(
        new ChangeUserRoleCommand(adminId, user.id, UserRole.PARTICIPANT),
      );

      expect(result.isSuccess).toBe(true);
      expect(mockRepository.updateRole).not.toHaveBeenCalled();
    });

    it('refuses to let an administrator change their own role', async () => {
      const result = await handler.execute(
        new ChangeUserRoleCommand(adminId, adminId, UserRole.PARTICIPANT),
      );

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('SELF_MODIFICATION');
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('fails for an unknown user', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await handler.execute(
        new ChangeUserRoleCommand(adminId, 'missing', UserRole.ADMIN),
      );

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('USER_NOT_FOUND');
    });

    it('reports persistence failures', async () => {
      mockRepository.findById.mockResolvedValue(user);
      mockRepository.updateRole.mockRejectedValue(new Error('db down'));

      const result = await handler.execute(
        new ChangeUserRoleCommand(adminId, user.id, UserRole.ADMIN),
      );

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('PERSISTENCE_ERROR');
    });
  });

  describe('SetUserActiveStatusHandler', () => {
    let handler: SetUserActiveStatusHandler;

    beforeEach(() => {
      handler = new SetUserActiveStatusHandler(mockRepository);
    });

    it('suspends an active account', async () => {
      mockRepository.findById
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({ ...user, isActive: false });

      const result = await handler.execute(
        new SetUserActiveStatusCommand(adminId, user.id, false),
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value.isActive).toBe(false);
      expect(mockRepository.updateActiveStatus).toHaveBeenCalledWith(user.id, false);
    });

    it('reactivates a suspended account', async () => {
      mockRepository.findById
        .mockResolvedValueOnce({ ...user, isActive: false })
        .mockResolvedValueOnce(user);

      const result = await handler.execute(
        new SetUserActiveStatusCommand(adminId, user.id, true),
      );

      expect(result.isSuccess).toBe(true);
      expect(mockRepository.updateActiveStatus).toHaveBeenCalledWith(user.id, true);
    });

    it('is idempotent', async () => {
      mockRepository.findById.mockResolvedValue(user);

      const result = await handler.execute(
        new SetUserActiveStatusCommand(adminId, user.id, true),
      );

      expect(result.isSuccess).toBe(true);
      expect(mockRepository.updateActiveStatus).not.toHaveBeenCalled();
    });

    it('refuses to let an administrator suspend themselves', async () => {
      const result = await handler.execute(
        new SetUserActiveStatusCommand(adminId, adminId, false),
      );

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('SELF_MODIFICATION');
    });

    it('fails for an unknown user', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await handler.execute(
        new SetUserActiveStatusCommand(adminId, 'missing', false),
      );

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('USER_NOT_FOUND');
    });
  });

  describe('SearchUsersHandler', () => {
    it('passes filters through and maps users to profiles', async () => {
      mockRepository.search.mockResolvedValue({
        data: [user],
        total: 1,
        page: 2,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: true,
      });
      const handler = new SearchUsersHandler(mockRepository);

      const result = await handler.execute(
        new SearchUsersQuery({ search: 'amal', role: UserRole.PARTICIPANT, isActive: true }, 2, 10),
      );

      expect(mockRepository.search).toHaveBeenCalledWith(
        { search: 'amal', role: UserRole.PARTICIPANT, isActive: true },
        { page: 2, limit: 10 },
      );
      expect(result.total).toBe(1);
      expect(result.data[0]).toMatchObject({
        id: user.id,
        email: user.email,
        isActive: true,
        createdAt: user.createdAt,
      });
    });
  });
});
