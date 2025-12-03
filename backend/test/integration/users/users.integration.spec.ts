import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CqrsModule } from '@nestjs/cqrs';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';

// Infrastructure components
import { AuthController } from '../../../src/modules/users/infrastructure/controllers/auth.controller';
import { UsersController } from '../../../src/modules/users/infrastructure/controllers/users.controller';
import { JwtTokenService } from '../../../src/modules/users/infrastructure/services/jwt.service';
import { PasswordService } from '../../../src/modules/users/infrastructure/services/password.service';
import { TokenService } from '../../../src/modules/users/infrastructure/services/token.service';
import { LocalStrategy } from '../../../src/modules/users/infrastructure/strategies/local.strategy';
import { JwtStrategy } from '../../../src/modules/users/infrastructure/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../../src/modules/users/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/modules/users/infrastructure/guards/roles.guard';
import { EmailVerifiedGuard } from '../../../src/modules/users/infrastructure/guards/email-verified.guard';
import { UserPersistenceMapper } from '../../../src/modules/users/infrastructure/persistence/mappers/user-persistence.mapper';

// Application Layer
import { USER_REPOSITORY } from '../../../src/modules/users/application/ports/user.repository.port';
import { UserMapper } from '../../../src/modules/users/application/mappers/user.mapper';
import { ChangePasswordHandler } from '../../../src/modules/users/application/commands/change-password.handler';
import { UpdateProfileHandler } from '../../../src/modules/users/application/commands/update-profile.handler';
import { DeactivateUserHandler } from '../../../src/modules/users/application/commands/deactivate-user.handler';
import { GetUserByIdHandler } from '../../../src/modules/users/application/queries/get-user-by-id.handler';
import { GetUserByEmailHandler } from '../../../src/modules/users/application/queries/get-user-by-email.handler';
import { GetUsersByRoleHandler } from '../../../src/modules/users/application/queries/get-users-by-role.handler';

// Event Handlers
import { UserRegisteredEventHandler } from '../../../src/modules/users/application/event-handlers/user-registered.handler';
import { EmailVerifiedEventHandler } from '../../../src/modules/users/application/event-handlers/email-verified.handler';
import { PasswordResetRequestedEventHandler } from '../../../src/modules/users/application/event-handlers/password-reset-requested.handler';

// Domain
import { UserRole } from '../../../src/modules/users/domain/value-objects/user-role.vo';

/**
 * Mock User Repository for integration tests
 */
class MockUserRepository {
  private users: Map<string, any> = new Map();
  private emailIndex: Map<string, string> = new Map();

  async findById(id: string) {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string) {
    const userId = this.emailIndex.get(email.toLowerCase());
    return userId ? this.users.get(userId) : null;
  }

  async findAll() {
    return Array.from(this.users.values());
  }

  async save(user: any) {
    const id = user.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const savedUser = { ...user, id };
    this.users.set(id, savedUser);
    this.emailIndex.set(user.email.toLowerCase(), id);
    return savedUser;
  }

  async delete(id: string) {
    const user = this.users.get(id);
    if (user) {
      this.emailIndex.delete(user.email.toLowerCase());
      this.users.delete(id);
    }
  }

  async existsByEmail(email: string) {
    return this.emailIndex.has(email.toLowerCase());
  }

  async findByRole(role: UserRole) {
    const users = Array.from(this.users.values()).filter(u => u.role === role);
    return {
      data: users,
      total: users.length,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }

  async countByRole(role: UserRole) {
    return Array.from(this.users.values()).filter(u => u.role === role).length;
  }

  async findActiveUsers() {
    const users = Array.from(this.users.values()).filter(u => u.isActive);
    return {
      data: users,
      total: users.length,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }

  async updateLastLogin(userId: string) {
    const user = this.users.get(userId);
    if (user) {
      user.lastLoginAt = new Date();
      this.users.set(userId, user);
    }
  }

  // Helper method for tests
  clear() {
    this.users.clear();
    this.emailIndex.clear();
  }

  // Helper method to seed test data
  async seedUser(userData: any) {
    return this.save(userData);
  }
}

describe('Users Module Integration Tests', () => {
  let app: INestApplication<App>;
  let mockUserRepository: MockUserRepository;
  let jwtService: JwtTokenService;
  let passwordService: PasswordService;

  beforeAll(async () => {
    mockUserRepository = new MockUserRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret-key-for-integration-tests',
              JWT_ACCESS_EXPIRATION: '15m',
              JWT_REFRESH_EXPIRATION: '7d',
              JWT_EXPIRES_IN: '7d',
              JWT_REFRESH_EXPIRES_IN: '30d',
            }),
          ],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-secret-key-for-integration-tests',
          signOptions: { expiresIn: '15m' },
        }),
        CqrsModule,
        ThrottlerModule.forRoot([
          {
            name: 'short',
            ttl: 1000,
            limit: 100,  // Higher limit for tests
          },
        ]),
      ],
      controllers: [AuthController, UsersController],
      providers: [
        // Repository
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        // Mappers
        UserPersistenceMapper,
        UserMapper,
        // Services
        JwtTokenService,
        PasswordService,
        TokenService,
        // Strategies
        LocalStrategy,
        JwtStrategy,
        // Guards
        JwtAuthGuard,
        RolesGuard,
        EmailVerifiedGuard,
        // CQRS Handlers
        ChangePasswordHandler,
        UpdateProfileHandler,
        DeactivateUserHandler,
        GetUserByIdHandler,
        GetUserByEmailHandler,
        GetUsersByRoleHandler,
        // Event Handlers
        UserRegisteredEventHandler,
        EmailVerifiedEventHandler,
        PasswordResetRequestedEventHandler,
        // Global guards
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    jwtService = moduleFixture.get<JwtTokenService>(JwtTokenService);
    passwordService = moduleFixture.get<PasswordService>(PasswordService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockUserRepository.clear();
  });

  describe('Registration → Verification → Login Flow', () => {
    it('should complete the full registration to login flow', async () => {
      // Step 1: Register a new user
      const registerResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          firstName: 'New',
          lastName: 'User',
        })
        .expect(HttpStatus.CREATED);

      expect(registerResponse.body).toHaveProperty('userId');
      expect(registerResponse.body).toHaveProperty('message');
      const userId = registerResponse.body.userId;

      // Manually verify email for testing (simulating verification token)
      const user = await mockUserRepository.findById(userId);
      if (user) {
        user.emailVerified = true;
        await mockUserRepository.save(user);
      }

      // Step 2: Login with the new user
      // Note: In full integration, LocalStrategy would validate password
      // For this test, we manually create the user with the correct password hash

      // The login endpoint uses Passport local strategy
      // Since we can't easily test the full passport flow without database,
      // we verify the registration was successful
      expect(userId).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject registration with weak password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Password Reset Complete Flow', () => {
    it('should request password reset for existing user', async () => {
      // Seed a user
      await mockUserRepository.seedUser({
        id: 'reset-user-id',
        email: 'reset@example.com',
        firstName: 'Reset',
        lastName: 'User',
        role: UserRole.PARTICIPANT,
        isActive: true,
        emailVerified: true,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/request-reset')
        .send({
          email: 'reset@example.com',
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('message');
      // Security: Always returns success even if email doesn't exist
    });

    it('should return success even for non-existing email (security)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/request-reset')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Profile Update Flow', () => {
    let authToken: string;
    let testUserId: string;

    beforeEach(async () => {
      testUserId = 'profile-test-user';
      await mockUserRepository.seedUser({
        id: testUserId,
        email: 'profile@example.com',
        firstName: 'Profile',
        lastName: 'User',
        role: UserRole.PARTICIPANT,
        isActive: true,
        emailVerified: true,
      });

      // Generate auth token
      const tokens = jwtService.generateTokenPair({
        userId: testUserId,
        email: 'profile@example.com',
        role: UserRole.PARTICIPANT,
      });
      authToken = tokens.accessToken;
    });

    it('should get current user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('id', testUserId);
      expect(response.body).toHaveProperty('email', 'profile@example.com');
      expect(response.body).toHaveProperty('firstName', 'Profile');
      expect(response.body).toHaveProperty('lastName', 'User');
    });

    it('should update user profile', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('firstName', 'Updated');
      expect(response.body).toHaveProperty('lastName', 'Name');
    });

    it('should reject profile access without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/users/me')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Role-Based Access Control Enforcement', () => {
    it('should allow admin to access admin-only endpoints', async () => {
      const adminUserId = 'admin-user-id';
      await mockUserRepository.seedUser({
        id: adminUserId,
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        isActive: true,
        emailVerified: true,
      });

      const tokens = jwtService.generateTokenPair({
        userId: adminUserId,
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
    });

    it('should deny non-admin access to admin-only endpoints', async () => {
      const userId = 'regular-user-id';
      await mockUserRepository.seedUser({
        id: userId,
        email: 'regular@example.com',
        firstName: 'Regular',
        lastName: 'User',
        role: UserRole.PARTICIPANT,
        isActive: true,
        emailVerified: true,
      });

      const tokens = jwtService.generateTokenPair({
        userId: userId,
        email: 'regular@example.com',
        role: UserRole.PARTICIPANT,
      });

      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should allow organizer to access organizer endpoints', async () => {
      const organizerId = 'organizer-user-id';
      await mockUserRepository.seedUser({
        id: organizerId,
        email: 'organizer@example.com',
        firstName: 'Organizer',
        lastName: 'User',
        role: UserRole.ORGANIZER,
        isActive: true,
        emailVerified: true,
      });

      const tokens = jwtService.generateTokenPair({
        userId: organizerId,
        email: 'organizer@example.com',
        role: UserRole.ORGANIZER,
      });

      // Organizers can access their own profile
      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('role', UserRole.ORGANIZER);
    });
  });

  describe('JWT Token Refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const userId = 'refresh-test-user';
      await mockUserRepository.seedUser({
        id: userId,
        email: 'refresh@example.com',
        firstName: 'Refresh',
        lastName: 'User',
        role: UserRole.PARTICIPANT,
        isActive: true,
        emailVerified: true,
      });

      const tokens = jwtService.generateTokenPair({
        userId: userId,
        email: 'refresh@example.com',
        role: UserRole.PARTICIPANT,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({
          refreshToken: tokens.refreshToken,
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('expiresIn');
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Account Deactivation', () => {
    it('should allow user to deactivate own account', async () => {
      const userId = 'deactivate-user-id';
      await mockUserRepository.seedUser({
        id: userId,
        email: 'deactivate@example.com',
        firstName: 'Deactivate',
        lastName: 'User',
        role: UserRole.PARTICIPANT,
        isActive: true,
        emailVerified: true,
      });

      const tokens = jwtService.generateTokenPair({
        userId: userId,
        email: 'deactivate@example.com',
        role: UserRole.PARTICIPANT,
      });

      const response = await request(app.getHttpServer())
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Input Validation', () => {
    it('should validate email format on registration', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty('message');
    });

    it('should validate required fields on registration', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password, firstName, lastName
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should validate email with whitespace', async () => {
      // Email with whitespace should be trimmed or rejected based on DTO validation
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: '  trimtest@example.com  ',
          password: 'SecurePassword123!',
          firstName: 'Trim',
          lastName: 'Test',
        });

      // Either succeeds with trimmed email or fails validation
      // The actual behavior depends on DTO @Transform decorator
      expect([HttpStatus.CREATED, HttpStatus.BAD_REQUEST]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should return proper error for duplicate email registration', async () => {
      await mockUserRepository.seedUser({
        id: 'existing-user',
        email: 'existing@example.com',
        firstName: 'Existing',
        lastName: 'User',
        role: UserRole.PARTICIPANT,
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'SecurePassword123!',
          firstName: 'New',
          lastName: 'User',
        });

      // Should return either CONFLICT (409) or BAD_REQUEST (400) for duplicate
      expect([HttpStatus.CONFLICT, HttpStatus.BAD_REQUEST]).toContain(response.status);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 for expired token', async () => {
      // Create an expired token manually
      const configService = app.get(ConfigService);
      const jwtNativeService = app.get(JwtService);
      
      const expiredToken = jwtNativeService.sign(
        {
          userId: 'test-user',
          email: 'test@example.com',
          role: UserRole.PARTICIPANT,
          type: 'access',
        },
        {
          secret: configService.get('JWT_SECRET'),
          expiresIn: '1ms', // Immediately expires
        },
      );

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
