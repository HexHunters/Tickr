import { Test, TestingModule } from '@nestjs/testing';

import { USER_REPOSITORY } from '@modules/users/application/ports/user.repository.port';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';
import { UserValidationServiceAdapter } from '@modules/events/infrastructure/adapters/user-validation.service.adapter';

describe('UserValidationServiceAdapter', () => {
  let adapter: UserValidationServiceAdapter;
  let mockUserRepository: {
    findById: jest.Mock;
  };

  beforeEach(async () => {
    mockUserRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserValidationServiceAdapter,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    adapter = module.get<UserValidationServiceAdapter>(UserValidationServiceAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateOrganizer', () => {
    it('should return valid result for existing organizer', async () => {
      // Arrange
      const userId = 'user-123';
      mockUserRepository.findById.mockResolvedValue({
        id: userId,
        email: 'organizer@test.com',
        role: UserRole.ORGANIZER,
        isActive: true,
      });

      // Act
      const result = await adapter.validateOrganizer(userId);

      // Assert
      expect(result).toEqual({
        exists: true,
        isOrganizer: true,
        isActive: true,
        role: UserRole.ORGANIZER,
      });
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should return valid result for admin user', async () => {
      // Arrange
      const userId = 'admin-123';
      mockUserRepository.findById.mockResolvedValue({
        id: userId,
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        isActive: true,
      });

      // Act
      const result = await adapter.validateOrganizer(userId);

      // Assert
      expect(result).toEqual({
        exists: true,
        isOrganizer: true, // Admin is also considered organizer
        isActive: true,
        role: UserRole.ADMIN,
      });
    });

    it('should return isOrganizer=false for participant', async () => {
      // Arrange
      const userId = 'participant-123';
      mockUserRepository.findById.mockResolvedValue({
        id: userId,
        email: 'participant@test.com',
        role: UserRole.PARTICIPANT,
        isActive: true,
      });

      // Act
      const result = await adapter.validateOrganizer(userId);

      // Assert
      expect(result).toEqual({
        exists: true,
        isOrganizer: false,
        isActive: true,
        role: UserRole.PARTICIPANT,
      });
    });

    it('should return exists=false for non-existent user', async () => {
      // Arrange
      const userId = 'non-existent-user';
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await adapter.validateOrganizer(userId);

      // Assert
      expect(result).toEqual({
        exists: false,
        isOrganizer: false,
        isActive: false,
      });
    });

    it('should return isActive=false for inactive user', async () => {
      // Arrange
      const userId = 'inactive-user';
      mockUserRepository.findById.mockResolvedValue({
        id: userId,
        email: 'inactive@test.com',
        role: UserRole.ORGANIZER,
        isActive: false,
      });

      // Act
      const result = await adapter.validateOrganizer(userId);

      // Assert
      expect(result.isActive).toBe(false);
    });

    it('should throw error when repository fails', async () => {
      // Arrange
      const userId = 'error-user';
      const error = new Error('Database connection failed');
      mockUserRepository.findById.mockRejectedValue(error);

      // Act & Assert
      await expect(adapter.validateOrganizer(userId)).rejects.toThrow(error);
    });
  });

  describe('userExists', () => {
    it('should return true for existing user', async () => {
      // Arrange
      const userId = 'existing-user';
      mockUserRepository.findById.mockResolvedValue({ id: userId });

      // Act
      const result = await adapter.userExists(userId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      // Arrange
      const userId = 'non-existent';
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await adapter.userExists(userId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isEventOwner', () => {
    it('should return true when user is the organizer', () => {
      // Arrange
      const userId = 'user-123';
      const organizerId = 'user-123';

      // Act
      const result = adapter.isEventOwner(userId, organizerId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user is not the organizer', () => {
      // Arrange
      const userId = 'user-123';
      const organizerId = 'user-456';

      // Act
      const result = adapter.isEventOwner(userId, organizerId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the specified role', async () => {
      // Arrange
      const userId = 'user-123';
      mockUserRepository.findById.mockResolvedValue({
        id: userId,
        role: UserRole.ORGANIZER,
      });

      // Act
      const result = await adapter.hasRole(userId, 'ORGANIZER');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user has different role', async () => {
      // Arrange
      const userId = 'user-123';
      mockUserRepository.findById.mockResolvedValue({
        id: userId,
        role: UserRole.PARTICIPANT,
      });

      // Act
      const result = await adapter.hasRole(userId, 'ORGANIZER');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      // Arrange
      const userId = 'non-existent';
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await adapter.hasRole(userId, 'ADMIN');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin user', async () => {
      // Arrange
      const userId = 'admin-123';
      mockUserRepository.findById.mockResolvedValue({
        id: userId,
        role: UserRole.ADMIN,
      });

      // Act
      const result = await adapter.isAdmin(userId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-admin user', async () => {
      // Arrange
      const userId = 'user-123';
      mockUserRepository.findById.mockResolvedValue({
        id: userId,
        role: UserRole.ORGANIZER,
      });

      // Act
      const result = await adapter.isAdmin(userId);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      // Arrange
      const userId = 'non-existent';
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await adapter.isAdmin(userId);

      // Assert
      expect(result).toBe(false);
    });
  });
});
