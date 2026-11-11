import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';
import { JwtPayload } from '@modules/users/infrastructure/services/jwt.service';
import { JwtStrategy, JwtUser } from '@modules/users/infrastructure/strategies/jwt.strategy';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockConfigService: any;

  beforeEach(async () => {
    mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('test-jwt-secret'),
      get: jest.fn().mockReturnValue('7d'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return JwtUser for valid access token payload', async () => {
      const payload: JwtPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: UserRole.PARTICIPANT,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual<JwtUser>({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      });
    });

    it('should throw UnauthorizedException for refresh token type', async () => {
      const payload: JwtPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: UserRole.PARTICIPANT,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      await expect(strategy.validate(payload))
        .rejects.toThrow(new UnauthorizedException('Invalid token type'));
    });

    it('should throw UnauthorizedException when userId is missing', async () => {
      const payload = {
        email: 'test@example.com',
        role: UserRole.PARTICIPANT,
        type: 'access',
      } as JwtPayload;

      await expect(strategy.validate(payload))
        .rejects.toThrow(new UnauthorizedException('Invalid token payload'));
    });

    it('should throw UnauthorizedException when email is missing', async () => {
      const payload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: UserRole.PARTICIPANT,
        type: 'access',
      } as JwtPayload;

      await expect(strategy.validate(payload))
        .rejects.toThrow(new UnauthorizedException('Invalid token payload'));
    });

    it('should throw UnauthorizedException when role is missing', async () => {
      const payload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        type: 'access',
      } as JwtPayload;

      await expect(strategy.validate(payload))
        .rejects.toThrow(new UnauthorizedException('Invalid token payload'));
    });

    it('should handle all user roles correctly', async () => {
      const roles = [UserRole.ADMIN, UserRole.ORGANIZER, UserRole.PARTICIPANT];

      for (const role of roles) {
        const payload: JwtPayload = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          role,
          type: 'access',
          mfa: true,
        };

        const result = await strategy.validate(payload);
        expect(result.role).toBe(role);
      }
    });

    it('should reject an admin access token issued without a second factor', async () => {
      for (const mfa of [undefined, false]) {
        await expect(
          strategy.validate({
            userId: '123e4567-e89b-12d3-a456-426614174000',
            email: 'admin@example.com',
            role: UserRole.ADMIN,
            type: 'access',
            mfa,
          }),
        ).rejects.toThrow(new UnauthorizedException('Two-factor authentication required'));
      }
    });

    it('should not require a second factor from organizers and participants', async () => {
      for (const role of [UserRole.ORGANIZER, UserRole.PARTICIPANT]) {
        const result = await strategy.validate({
          userId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          role,
          type: 'access',
        });
        expect(result.role).toBe(role);
      }
    });

    it('should reject an MFA sign-in challenge used as an access token', async () => {
      await expect(
        strategy.validate({
          userId: '123e4567-e89b-12d3-a456-426614174000',
          type: 'mfa_challenge',
        } as unknown as JwtPayload),
      ).rejects.toThrow(new UnauthorizedException('Invalid token type'));
    });

    it('should only return essential user fields', async () => {
      const payload: JwtPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: UserRole.PARTICIPANT,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const result = await strategy.validate(payload);

      // Should only have these three fields
      expect(Object.keys(result)).toEqual(['userId', 'email', 'role']);
      // Should not expose token metadata
      expect(result).not.toHaveProperty('iat');
      expect(result).not.toHaveProperty('exp');
      expect(result).not.toHaveProperty('type');
    });
  });

  describe('configuration', () => {
    it('should use JWT_SECRET from config', () => {
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
    });
  });
});
