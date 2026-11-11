import { ChangePasswordHandler } from '@modules/users/application/commands/change-password.handler';
import { ConfirmMfaEnrollmentHandler } from '@modules/users/application/commands/confirm-mfa-enrollment.handler';
import { DeactivateUserHandler } from '@modules/users/application/commands/deactivate-user.handler';
import { RegenerateRecoveryCodesHandler } from '@modules/users/application/commands/regenerate-recovery-codes.handler';
import { StartMfaEnrollmentHandler } from '@modules/users/application/commands/start-mfa-enrollment.handler';
import { UpdateProfileHandler } from '@modules/users/application/commands/update-profile.handler';
import { VerifyMfaHandler } from '@modules/users/application/commands/verify-mfa.handler';
import { MFA_CRYPTO } from '@modules/users/application/ports/mfa-crypto.port';
import { MFA_REPOSITORY } from '@modules/users/application/ports/mfa.repository.port';
import { USER_REPOSITORY } from '@modules/users/application/ports/user.repository.port';
import type { UserEntityPort } from '@modules/users/application/ports/user.repository.port';
import { GetMfaStatusHandler } from '@modules/users/application/queries/get-mfa-status.handler';
import { GetUserByIdHandler } from '@modules/users/application/queries/get-user-by-id.handler';
import { GetUsersByRoleHandler } from '@modules/users/application/queries/get-users-by-role.handler';
import { MFA_MAX_FAILED_ATTEMPTS, MfaCodeVerifier } from '@modules/users/application/services/mfa-code-verifier.service';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';
import { AuthController } from '@modules/users/infrastructure/controllers/auth.controller';
import { MfaController } from '@modules/users/infrastructure/controllers/mfa.controller';
import { UsersController } from '@modules/users/infrastructure/controllers/users.controller';
import { JwtAuthGuard } from '@modules/users/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/users/infrastructure/guards/roles.guard';
import { VerificationTokenRepository } from '@modules/users/infrastructure/persistence/repositories/verification-token.repository';
import { JwtTokenService } from '@modules/users/infrastructure/services/jwt.service';
import { base32Decode, hotp, MfaCryptoService } from '@modules/users/infrastructure/services/mfa-crypto.service';
import { PasswordService } from '@modules/users/infrastructure/services/password.service';
import { JwtStrategy } from '@modules/users/infrastructure/strategies/jwt.strategy';
import { LocalStrategy } from '@modules/users/infrastructure/strategies/local.strategy';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule, ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { AllExceptionsFilter } from '@shared/infrastructure/common/filters/all-exceptions.filter';
import request from 'supertest';
import { App } from 'supertest/types';

import { InMemoryMfaRepository } from '../../helpers/in-memory-mfa.repository';


const PASSWORD = 'MfaE2e!2026';
const SECRET = 'admin-mfa-e2e-secret-key-minimum-32-characters';
const ids = {
  admin: '00000000-0000-4000-8000-0000000000a1',
  participant: '00000000-0000-4000-8000-0000000000c1',
};

type StoredUser = UserEntityPort & { passwordHash: string; emailVerified: boolean };

class InMemoryUsers {
  readonly users = new Map<string, StoredUser>();
  async findById(id: string) {
    return this.users.get(id) ?? null;
  }
  async findByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email === email.toLowerCase()) ?? null;
  }
  async findByEmailWithPassword(email: string) {
    return this.findByEmail(email);
  }
  async updateLastLogin(id: string) {
    const user = this.users.get(id);
    if (user) this.users.set(id, { ...user, lastLoginAt: new Date() });
  }
}

/** Avoid computing a code in the last second of a 30 s window. */
async function safeWindow(): Promise<void> {
  const remaining = 30_000 - (Date.now() % 30_000);
  if (remaining < 1500) await new Promise((resolve) => setTimeout(resolve, remaining + 50));
}
const totp = (secret: string, offset = 0) =>
  hotp(base32Decode(secret), Math.floor(Date.now() / 30_000) + offset);

describe('E2E: Administrator two-factor authentication', () => {
  let app: INestApplication<App>;
  let throttleStorage: ThrottlerStorageService;
  let users: InMemoryUsers;
  let mfa: InMemoryMfaRepository;

  beforeAll(async () => {
    users = new InMemoryUsers();
    mfa = new InMemoryMfaRepository();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ JWT_SECRET: SECRET, JWT_EXPIRES_IN: '15m', BCRYPT_ROUNDS: 4 })],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: SECRET }),
        EventEmitterModule.forRoot(),
        ThrottlerModule.forRoot([
          { name: 'short', ttl: 1000, limit: 3 },
          { name: 'medium', ttl: 10000, limit: 20 },
          { name: 'long', ttl: 60000, limit: 100 },
        ]),
      ],
      controllers: [AuthController, MfaController, UsersController],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: USER_REPOSITORY, useValue: users },
        { provide: MFA_REPOSITORY, useValue: mfa },
        { provide: MFA_CRYPTO, useClass: MfaCryptoService },
        { provide: VerificationTokenRepository, useValue: {} },
        JwtTokenService,
        PasswordService,
        LocalStrategy,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        MfaCodeVerifier,
        StartMfaEnrollmentHandler,
        ConfirmMfaEnrollmentHandler,
        VerifyMfaHandler,
        RegenerateRecoveryCodesHandler,
        GetMfaStatusHandler,
        GetUserByIdHandler,
        GetUsersByRoleHandler,
        ChangePasswordHandler,
        UpdateProfileHandler,
        DeactivateUserHandler,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    throttleStorage = moduleFixture.get<ThrottlerStorageService>(ThrottlerStorage);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.setGlobalPrefix('api');
    await app.listen(0);
    for (const level of ['log', 'warn', 'error'] as const) jest.spyOn(Logger.prototype, level).mockImplementation();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await app?.close();
  });

  beforeEach(async () => {
    throttleStorage.onApplicationShutdown();
    throttleStorage.storage.clear();
    mfa.states.clear();
    mfa.codes.clear();
    users.users.clear();
    const passwordHash = await app.get(PasswordService).hash(PASSWORD);
    const seed = (id: string, email: string, role: UserRole) =>
      users.users.set(id, {
        id,
        email,
        firstName: 'Test',
        lastName: role,
        role,
        phone: null,
        isActive: true,
        emailVerified: true,
        passwordHash,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    seed(ids.admin, 'admin@tickr.tn', UserRole.ADMIN);
    seed(ids.participant, 'amal@tickr.tn', UserRole.PARTICIPANT);
  });

  const http = () => request(app.getHttpServer());
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  const login = (email: string) => http().post('/api/auth/login').send({ email, password: PASSWORD });

  async function enroll(): Promise<{ secret: string; recoveryCodes: string[]; accessToken: string; refreshToken: string }> {
    const challenge = (await login('admin@tickr.tn').expect(200)).body;
    const setup = (await http().post('/api/auth/mfa/enroll/start').send({ mfaToken: challenge.mfaToken }).expect(200)).body;
    await safeWindow();
    const session = (
      await http()
        .post('/api/auth/mfa/enroll/confirm')
        .send({ mfaToken: challenge.mfaToken, code: totp(setup.secret, -1) })
        .expect(200)
    ).body;
    return { secret: setup.secret, recoveryCodes: session.recoveryCodes, accessToken: session.accessToken, refreshToken: session.refreshToken };
  }

  async function challenge(): Promise<string> {
    const body = (await login('admin@tickr.tn').expect(200)).body;
    expect(body).toMatchObject({ mfaRequired: true, mfaMethod: 'VERIFY' });
    return body.mfaToken;
  }

  describe('first sign-in', () => {
    it('requires enrollment and opens no session with the password alone', async () => {
      const response = await login('admin@tickr.tn').expect(200);

      expect(response.body).toEqual({
        mfaRequired: true,
        mfaMethod: 'ENROLL',
        mfaToken: expect.any(String),
        expiresIn: 300,
      });
      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('refreshToken');
      // The challenge is neither an access nor a refresh token.
      await http().get('/api/users/me').set(bearer(response.body.mfaToken)).expect(401);
      await http().post('/api/auth/refresh-token').send({ refreshToken: response.body.mfaToken }).expect(401);
    });

    it('enrolls with a QR code, confirms with a code, and returns 10 recovery codes once', async () => {
      const { mfaToken } = (await login('admin@tickr.tn').expect(200)).body;

      const setup = await http().post('/api/auth/mfa/enroll/start').send({ mfaToken }).expect(200);
      expect(setup.body).toEqual({
        secret: expect.stringMatching(/^[A-Z2-7]{32}$/),
        otpauthUri: expect.stringMatching(/^otpauth:\/\/totp\/Tickr:admin%40tickr\.tn\?secret=/),
        qrCodeDataUrl: expect.stringMatching(/^data:image\/png;base64,/),
      });

      const wrong = await http().post('/api/auth/mfa/enroll/confirm').send({ mfaToken, code: '000000' }).expect(401);
      expect(wrong.body.code).toBe('INVALID_MFA_CODE');

      await safeWindow();
      const session = await http()
        .post('/api/auth/mfa/enroll/confirm')
        .send({ mfaToken, code: totp(setup.body.secret) })
        .expect(200);
      expect(session.body.recoveryCodes).toHaveLength(10);
      expect(session.body.user).toMatchObject({ id: ids.admin, role: 'ADMIN' });

      // The session works on admin-only routes.
      await http().get(`/api/users/${ids.participant}`).set(bearer(session.body.accessToken)).expect(200);
      const status = await http().get('/api/users/me/mfa').set(bearer(session.body.accessToken)).expect(200);
      expect(status.body).toMatchObject({ enabled: true, required: true, remainingRecoveryCodes: 10 });
    });

    it('cannot swap an enrolled authenticator with the password alone', async () => {
      await enroll();
      const mfaToken = await challenge();

      const restart = await http().post('/api/auth/mfa/enroll/start').send({ mfaToken }).expect(409);

      expect(restart.body.code).toBe('MFA_ALREADY_ENROLLED');
    });
  });

  describe('later sign-ins', () => {
    it('opens the session with a fresh code, and refuses the same code twice', async () => {
      const { secret } = await enroll();
      const mfaToken = await challenge();
      await safeWindow();
      const code = totp(secret, 1);

      const session = await http().post('/api/auth/mfa/verify').send({ mfaToken, code }).expect(200);
      const replay = await http().post('/api/auth/mfa/verify').send({ mfaToken, code }).expect(401);

      expect(session.body).toMatchObject({ method: 'TOTP', remainingRecoveryCodes: 10 });
      await http().get(`/api/users/${ids.participant}`).set(bearer(session.body.accessToken)).expect(200);
      expect(replay.body.code).toBe('INVALID_MFA_CODE');
    });

    it('accepts each recovery code once and reports what is left', async () => {
      const { recoveryCodes } = await enroll();
      const mfaToken = await challenge();

      const first = await http().post('/api/auth/mfa/verify').send({ mfaToken, recoveryCode: recoveryCodes[0].toLowerCase() }).expect(200);
      const reuse = await http().post('/api/auth/mfa/verify').send({ mfaToken, recoveryCode: recoveryCodes[0] }).expect(401);

      expect(first.body).toMatchObject({ method: 'RECOVERY_CODE', remainingRecoveryCodes: 9 });
      expect(reuse.body.code).toBe('INVALID_MFA_CODE');
    });

    it('lets only one of two simultaneous requests use the same code', async () => {
      const { secret } = await enroll();
      const mfaToken = await challenge();
      await safeWindow();
      const code = totp(secret, 1);

      const responses = await Promise.all([
        http().post('/api/auth/mfa/verify').send({ mfaToken, code }),
        http().post('/api/auth/mfa/verify').send({ mfaToken, code }),
      ]);

      expect(responses.map((r) => r.status).sort()).toEqual([200, 401]);
    });

    it('locks the factor after repeated wrong codes, even for the right one', async () => {
      const { secret } = await enroll();
      const mfaToken = await challenge();
      for (let attempt = 1; attempt < MFA_MAX_FAILED_ATTEMPTS; attempt += 1) {
        await http().post('/api/auth/mfa/verify').send({ mfaToken, code: '000000' }).expect(401);
      }
      const locking = await http().post('/api/auth/mfa/verify').send({ mfaToken, code: '000000' }).expect(429);
      expect(locking.body.code).toBe('MFA_LOCKED');

      await safeWindow();
      const right = await http().post('/api/auth/mfa/verify').send({ mfaToken, code: totp(secret, 1) }).expect(429);
      expect(right.body.code).toBe('MFA_LOCKED');
    });

    it('validates the request shape', async () => {
      await enroll();
      const mfaToken = await challenge();

      await http().post('/api/auth/mfa/verify').send({ mfaToken }).expect(400);
      await http().post('/api/auth/mfa/verify').send({ mfaToken, code: '123456', recoveryCode: 'ABCDE-FGHJK' }).expect(400);
      await http().post('/api/auth/mfa/verify').send({ mfaToken, code: '12345' }).expect(400);
      await http().post('/api/auth/mfa/verify').send({ mfaToken: 'not-a-jwt', code: '123456' }).expect(400);
    });

    it('refuses an expired, forged or reused-after-suspension challenge', async () => {
      await enroll();
      const mfaToken = await challenge();
      const forged = app.get(JwtTokenService).signAccessToken({ userId: ids.admin, email: 'admin@tickr.tn', role: UserRole.ADMIN });

      const wrongType = await http().post('/api/auth/mfa/verify').send({ mfaToken: forged, code: '123456' }).expect(401);
      expect(wrongType.body.code).toBe('MFA_CHALLENGE_EXPIRED');

      users.users.set(ids.admin, { ...users.users.get(ids.admin)!, isActive: false });
      const suspended = await http().post('/api/auth/mfa/verify').send({ mfaToken, code: '123456' }).expect(401);
      expect(suspended.body.code).toBe('MFA_CHALLENGE_EXPIRED');
    });
  });

  describe('sessions', () => {
    it('keeps the second-factor claim across refreshes', async () => {
      const { refreshToken } = await enroll();

      const refreshed = await http().post('/api/auth/refresh-token').send({ refreshToken }).expect(200);

      await http().get(`/api/users/${ids.participant}`).set(bearer(refreshed.body.accessToken)).expect(200);
    });

    it('rejects admin sessions opened before MFA existed (no claim)', async () => {
      const legacy = app.get(JwtTokenService).generateTokenPair({ userId: ids.admin, email: 'admin@tickr.tn', role: UserRole.ADMIN });

      await http().get('/api/users/me').set(bearer(legacy.accessToken)).expect(401);
      await http().post('/api/auth/refresh-token').send({ refreshToken: legacy.refreshToken }).expect(401);
    });

    it('leaves participants signing in with their password only', async () => {
      const response = await login('amal@tickr.tn').expect(200);

      expect(response.body).toMatchObject({ accessToken: expect.any(String), user: { role: 'PARTICIPANT' } });
      expect(response.body).not.toHaveProperty('mfaRequired');
      await http().get('/api/users/me').set(bearer(response.body.accessToken)).expect(200);
      await http().post('/api/auth/mfa/enroll/start').send({ mfaToken: response.body.accessToken }).expect(401);
    });
  });

  describe('recovery codes from the account page', () => {
    it('regenerates codes with a current authenticator code, invalidating the old ones', async () => {
      const { secret, recoveryCodes, accessToken } = await enroll();
      await safeWindow();

      const regenerated = await http()
        .post('/api/users/me/mfa/recovery-codes')
        .set(bearer(accessToken))
        .send({ code: totp(secret, 1) })
        .expect(200);

      expect(regenerated.body.recoveryCodes).toHaveLength(10);
      const mfaToken = await challenge();
      await http().post('/api/auth/mfa/verify').send({ mfaToken, recoveryCode: recoveryCodes[0] }).expect(401);
      await http().post('/api/auth/mfa/verify').send({ mfaToken, recoveryCode: regenerated.body.recoveryCodes[0] }).expect(200);
    });

    it('requires an authenticator code (not a recovery code) and a signed-in session', async () => {
      const { recoveryCodes, accessToken } = await enroll();

      await http().post('/api/users/me/mfa/recovery-codes').set(bearer(accessToken)).send({ code: recoveryCodes[0] }).expect(400);
      await http().post('/api/users/me/mfa/recovery-codes').set(bearer(accessToken)).send({ code: '000000' }).expect(401);
      await http().post('/api/users/me/mfa/recovery-codes').send({ code: '123456' }).expect(401);
      await http().get('/api/users/me/mfa').expect(401);
    });
  });
});
