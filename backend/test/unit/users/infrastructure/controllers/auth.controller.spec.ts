import { USER_REPOSITORY } from '@modules/users/application/ports/user.repository.port';
import { HashedPasswordVO } from '@modules/users/domain/value-objects/hashed-password.vo';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';
import { AuthController } from '@modules/users/infrastructure/controllers/auth.controller';
import { VerificationTokenRepository } from '@modules/users/infrastructure/persistence/repositories/verification-token.repository';
import { JwtTokenService } from '@modules/users/infrastructure/services/jwt.service';
import { PasswordService } from '@modules/users/infrastructure/services/password.service';
import {
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

// Mock crypto.randomUUID
const mockUUID = '123e4567-e89b-12d3-a456-426614174000';
global.crypto = {
  randomUUID: jest.fn().mockReturnValue(mockUUID),
} as any;

describe('AuthController', () => {
  let controller: AuthController;
  let mockJwtService: any;
  let mockPasswordService: any;
  let mockUserRepository: any;
  let mockVerificationTokenRepository: any;
  let mockEventEmitter: any;
  let mockConfigService: any;

  const mockUser = {
    id: mockUUID,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.PARTICIPANT,
    phone: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokenPair = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 604800,
  };

  beforeEach(async () => {
    mockJwtService = {
      generateTokenPair: jest.fn().mockReturnValue(mockTokenPair),
      signAccessToken: jest.fn().mockReturnValue('new-access-token'),
      verifyRefreshToken: jest.fn(),
      getAccessTokenExpiration: jest.fn().mockReturnValue(604800),
    };

    mockPasswordService = {
      hash: jest.fn(),
      compare: jest.fn(),
      createHashedPassword: jest.fn(),
    };

    mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      existsByEmail: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    mockVerificationTokenRepository = {
      findValidToken: jest.fn(),
      markAsUsed: jest.fn(),
      createEmailVerificationToken: jest.fn().mockResolvedValue('mock-verification-token'),
      createPasswordResetToken: jest.fn(),
      invalidateUserTokens: jest.fn(),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('http://localhost:3001'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: JwtTokenService, useValue: mockJwtService },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: VerificationTokenRepository, useValue: mockVerificationTokenRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'SecurePass123!',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should register a new user successfully', async () => {
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockPasswordService.createHashedPassword.mockResolvedValue({
        hash: 'hashed-password',
      } as HashedPasswordVO);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await controller.register(registerDto);

      expect(result).toEqual({
        userId: mockUUID,
        message: 'Registration successful. Please check your email to verify your account.',
      });
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith('new@example.com');
      expect(mockPasswordService.createHashedPassword).toHaveBeenCalledWith('SecurePass123!');
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockVerificationTokenRepository.createEmailVerificationToken).toHaveBeenCalledWith(mockUUID);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('user.registered', {
        userId: mockUUID,
        email: 'new@example.com',
        firstName: 'Jane',
        verificationToken: 'mock-verification-token',
        verificationUrl: 'http://localhost:3001/verify-email?token=mock-verification-token',
      });
    });

    it('should throw BadRequestException when email already exists', async () => {
      mockUserRepository.existsByEmail.mockResolvedValue(true);

      await expect(controller.register(registerDto))
        .rejects.toThrow(new BadRequestException('Email already registered'));
    });

    it('should create user with PARTICIPANT role by default', async () => {
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockPasswordService.createHashedPassword.mockResolvedValue({
        hash: 'hashed-password',
      } as HashedPasswordVO);
      mockUserRepository.save.mockImplementation((user: any) => Promise.resolve(user));

      await controller.register(registerDto);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.PARTICIPANT,
        }),
      );
    });

    it('should lowercase email before saving', async () => {
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockPasswordService.createHashedPassword.mockResolvedValue({
        hash: 'hashed-password',
      } as HashedPasswordVO);
      mockUserRepository.save.mockImplementation((user: any) => Promise.resolve(user));

      await controller.register({ ...registerDto, email: 'TEST@EXAMPLE.COM' });

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
        }),
      );
    });
  });

  describe('login', () => {
    const validatedUser = {
      userId: mockUUID,
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.PARTICIPANT,
      isActive: true,
      emailVerified: true,
    };

    it('should return tokens and user data on successful login', async () => {
      const result = await controller.login({ user: validatedUser });

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 604800,
        user: {
          id: validatedUser.userId,
          email: validatedUser.email,
          firstName: validatedUser.firstName,
          lastName: validatedUser.lastName,
          role: validatedUser.role,
        },
      });
      expect(mockJwtService.generateTokenPair).toHaveBeenCalledWith({
        userId: validatedUser.userId,
        email: validatedUser.email,
        role: validatedUser.role,
      });
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(validatedUser.userId);
    });

    it('should throw ForbiddenException when email is not verified', async () => {
      const unverifiedUser = { ...validatedUser, emailVerified: false };

      await expect(controller.login({ user: unverifiedUser }))
        .rejects.toThrow(new ForbiddenException('Email not verified. Please verify your email address.'));
    });
  });

  describe('verifyEmail', () => {
    it('should throw BadRequestException for invalid token', async () => {
      await expect(controller.verifyEmail({ token: 'invalid-token' }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('resendVerification', () => {
    it('should return success message regardless of email existence', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await controller.resendVerification({ email: 'any@example.com' });

      expect(result).toEqual({
        message: 'If an account with that email exists and is unverified, a verification link has been sent.',
      });
    });

    it('should send verification email for unverified user', async () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      mockUserRepository.findByEmail.mockResolvedValue(unverifiedUser);

      const result = await controller.resendVerification({ email: 'test@example.com' });

      expect(result.message).toContain('verification link has been sent');
      expect(mockVerificationTokenRepository.createEmailVerificationToken).toHaveBeenCalledWith(mockUUID);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('user.registered', expect.objectContaining({
        userId: mockUUID,
        email: 'test@example.com',
        verificationToken: 'mock-verification-token',
      }));
    });

    it('should not send email for already verified user', async () => {
      const verifiedUser = { ...mockUser, emailVerified: true };
      mockUserRepository.findByEmail.mockResolvedValue(verifiedUser);

      await controller.resendVerification({ email: 'test@example.com' });

      expect(mockVerificationTokenRepository.createEmailVerificationToken).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should not reveal if email exists or verification status', async () => {
      // Security feature - response should be the same for all cases
      mockUserRepository.findByEmail.mockResolvedValue(null);
      const result1 = await controller.resendVerification({ email: 'notexists@example.com' });

      mockUserRepository.findByEmail.mockResolvedValue({ ...mockUser, emailVerified: true });
      const result2 = await controller.resendVerification({ email: 'verified@example.com' });

      mockUserRepository.findByEmail.mockResolvedValue({ ...mockUser, emailVerified: false });
      const result3 = await controller.resendVerification({ email: 'unverified@example.com' });

      expect(result1.message).toBe(result2.message);
      expect(result2.message).toBe(result3.message);
    });
  });

  describe('requestPasswordReset', () => {
    it('should return success message regardless of email existence', async () => {
      const result = await controller.requestPasswordReset({ email: 'any@example.com' });

      expect(result).toEqual({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    });

    it('should not reveal if email exists or not', async () => {
      // This is a security feature - response should be the same
      const result1 = await controller.requestPasswordReset({ email: 'exists@example.com' });
      const result2 = await controller.requestPasswordReset({ email: 'notexists@example.com' });

      expect(result1.message).toBe(result2.message);
    });
  });

  describe('resetPassword', () => {
    it('should throw BadRequestException for invalid token', async () => {
      await expect(controller.resetPassword({ token: 'invalid', newPassword: 'NewPass123!' }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshToken', () => {
    const refreshPayload = {
      userId: mockUUID,
      email: 'test@example.com',
      role: UserRole.PARTICIPANT,
      type: 'refresh' as const,
    };

    it('should return new access token for valid refresh token', async () => {
      mockJwtService.verifyRefreshToken.mockResolvedValue(refreshPayload);

      const result = await controller.refreshToken({ refreshToken: 'valid-refresh-token' });

      expect(result).toEqual({
        accessToken: 'new-access-token',
        expiresIn: 604800,
      });
      expect(mockJwtService.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockJwtService.signAccessToken).toHaveBeenCalledWith({
        userId: refreshPayload.userId,
        email: refreshPayload.email,
        role: refreshPayload.role,
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verifyRefreshToken.mockRejectedValue(new Error('Invalid token'));

      await expect(controller.refreshToken({ refreshToken: 'invalid-token' }))
        .rejects.toThrow(new UnauthorizedException('Invalid or expired refresh token'));
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      mockJwtService.verifyRefreshToken.mockRejectedValue(new Error('Token expired'));

      await expect(controller.refreshToken({ refreshToken: 'expired-token' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });
});
