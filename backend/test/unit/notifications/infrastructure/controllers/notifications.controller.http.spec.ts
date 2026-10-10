/**
 * @file NotificationsController HTTP Unit Tests
 * @description Boots the controller behind the real shared JwtAuthGuard and
 * the users-module JwtStrategy, so the handlers receive the userId of the
 * principal the strategy attaches ({ userId, email, role }) instead of a
 * hand-written request.user.
 */

import { SendNotificationHandler } from '@modules/notifications/application/commands/send-notification/send-notification.handler';
import { UnsubscribeHandler } from '@modules/notifications/application/commands/unsubscribe/unsubscribe.handler';
import { UpdatePreferencesCommand } from '@modules/notifications/application/commands/update-preferences/update-preferences.command';
import { UpdatePreferencesHandler } from '@modules/notifications/application/commands/update-preferences/update-preferences.handler';
import { NotificationMapper } from '@modules/notifications/application/mappers/notification.mapper';
import { GetNotificationByIdHandler } from '@modules/notifications/application/queries/get-notification-by-id/get-notification-by-id.handler';
import { GetNotificationByIdQuery } from '@modules/notifications/application/queries/get-notification-by-id/get-notification-by-id.query';
import { GetUserNotificationsHandler } from '@modules/notifications/application/queries/get-user-notifications/get-user-notifications.handler';
import { GetUserNotificationsQuery } from '@modules/notifications/application/queries/get-user-notifications/get-user-notifications.query';
import { GetUserPreferencesHandler } from '@modules/notifications/application/queries/get-user-preferences/get-user-preferences.handler';
import { GetUserPreferencesQuery } from '@modules/notifications/application/queries/get-user-preferences/get-user-preferences.query';
import {
  NotificationChannel,
  NotificationEntity,
  NotificationPreferenceEntity,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  RecipientVO,
} from '@modules/notifications/domain';
import { NotificationsController } from '@modules/notifications/infrastructure/controllers/notifications.controller';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';
import type { JwtPayload } from '@modules/users/infrastructure/services/jwt.service';
import { JwtStrategy } from '@modules/users/infrastructure/strategies/jwt.strategy';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { Result } from '@shared/domain/result';
import { AllExceptionsFilter } from '@shared/infrastructure/common/filters/all-exceptions.filter';
import request from 'supertest';

describe('NotificationsController (HTTP)', () => {
  const jwtSecret = 'notifications-http-spec-secret';
  const userId = '550e8400-e29b-41d4-a716-446655440001';
  const notificationId = '550e8400-e29b-41d4-a716-446655440010';

  let app: INestApplication;
  let accessToken: string;

  const mockGetUserNotificationsHandler: jest.Mocked<
    Pick<GetUserNotificationsHandler, 'execute'>
  > = { execute: jest.fn() };
  const mockGetByIdHandler: jest.Mocked<
    Pick<GetNotificationByIdHandler, 'execute'>
  > = { execute: jest.fn() };
  const mockGetUserPreferencesHandler: jest.Mocked<
    Pick<GetUserPreferencesHandler, 'execute'>
  > = { execute: jest.fn() };
  const mockUpdatePreferencesHandler: jest.Mocked<
    Pick<UpdatePreferencesHandler, 'execute'>
  > = { execute: jest.fn() };

  const createNotification = (): NotificationEntity => {
    return NotificationEntity.reconstitute({
      id: notificationId,
      userId,
      type: NotificationType.ORDER_CONFIRMATION,
      channel: NotificationChannel.EMAIL,
      priority: NotificationPriority.MEDIUM,
      subject: 'Order Confirmed',
      content: '<p>Your order is confirmed</p>',
      templateId: null,
      templateData: {},
      recipient: RecipientVO.reconstitute('user@example.com', null),
      status: NotificationStatus.SENT,
      scheduledFor: null,
      sentAt: new Date(),
      deliveredAt: null,
      failureReason: null,
      retryCount: 0,
      maxRetries: 3,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  const createPreference = (): NotificationPreferenceEntity => {
    return NotificationPreferenceEntity.reconstitute({
      id: '550e8400-e29b-41d4-a716-446655440099',
      userId,
      emailEnabled: true,
      smsEnabled: false,
      marketingEnabled: true,
      eventRemindersEnabled: true,
      unsubscribeToken: 'a'.repeat(64),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: jwtSecret,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [NotificationsController],
      providers: [
        {
          provide: ConfigService,
          useValue: new ConfigService({ JWT_SECRET: jwtSecret }),
        },
        JwtStrategy,
        { provide: SendNotificationHandler, useValue: { execute: jest.fn() } },
        {
          provide: UpdatePreferencesHandler,
          useValue: mockUpdatePreferencesHandler,
        },
        { provide: UnsubscribeHandler, useValue: { execute: jest.fn() } },
        { provide: GetNotificationByIdHandler, useValue: mockGetByIdHandler },
        {
          provide: GetUserNotificationsHandler,
          useValue: mockGetUserNotificationsHandler,
        },
        {
          provide: GetUserPreferencesHandler,
          useValue: mockGetUserPreferencesHandler,
        },
        NotificationMapper,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useLogger(false);
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    const payload: JwtPayload = {
      userId,
      email: 'user@tickr.tn',
      role: UserRole.PARTICIPANT,
      type: 'access',
    };
    accessToken = module.get(JwtService).sign(payload);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /notifications/me', () => {
    it('should query the notifications of the JWT principal', async () => {
      mockGetUserNotificationsHandler.execute.mockResolvedValue(
        Result.ok({
          data: [createNotification()],
          total: 1,
          page: 2,
          limit: 5,
        }),
      );

      const response = await request(app.getHttpServer())
        .get('/api/notifications/me')
        .query({ page: 2, limit: 5 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(mockGetUserNotificationsHandler.execute).toHaveBeenCalledTimes(1);
      const [query] = mockGetUserNotificationsHandler.execute.mock.calls[0];
      expect(query).toBeInstanceOf(GetUserNotificationsQuery);
      expect(query).toMatchObject({ userId, page: 2, limit: 5 });
      expect(response.body).toMatchObject({
        data: [{ id: notificationId, userId }],
        total: 1,
        page: 2,
        limit: 5,
      });
    });
  });

  describe('GET /notifications/:id', () => {
    it('should look the notification up for the JWT principal', async () => {
      mockGetByIdHandler.execute.mockResolvedValue(
        Result.ok(createNotification()),
      );

      const response = await request(app.getHttpServer())
        .get(`/api/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(mockGetByIdHandler.execute).toHaveBeenCalledTimes(1);
      const [query] = mockGetByIdHandler.execute.mock.calls[0];
      expect(query).toBeInstanceOf(GetNotificationByIdQuery);
      expect(query).toMatchObject({ notificationId, userId });
      expect(response.body).toMatchObject({ id: notificationId, userId });
    });
  });

  describe('GET /notifications/preferences/me', () => {
    it('should return 200 with the preferences of the JWT principal', async () => {
      mockGetUserPreferencesHandler.execute.mockResolvedValue(
        Result.ok(createPreference()),
      );

      const response = await request(app.getHttpServer())
        .get('/api/notifications/preferences/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(mockGetUserPreferencesHandler.execute).toHaveBeenCalledTimes(1);
      const [query] = mockGetUserPreferencesHandler.execute.mock.calls[0];
      expect(query).toBeInstanceOf(GetUserPreferencesQuery);
      expect(query).toMatchObject({ userId });
      expect(response.body).toEqual({
        userId,
        emailEnabled: true,
        smsEnabled: false,
        marketingEnabled: true,
        eventRemindersEnabled: true,
      });
    });
  });

  describe('PUT /notifications/preferences/me', () => {
    it('should return 200 after updating the preferences of the JWT principal', async () => {
      mockUpdatePreferencesHandler.execute.mockResolvedValue(
        Result.ok({
          userId,
          emailEnabled: false,
          smsEnabled: true,
          marketingEnabled: true,
          eventRemindersEnabled: true,
        }),
      );

      const response = await request(app.getHttpServer())
        .put('/api/notifications/preferences/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ emailEnabled: false, marketingEnabled: true })
        .expect(HttpStatus.OK);

      expect(mockUpdatePreferencesHandler.execute).toHaveBeenCalledTimes(1);
      const [command] = mockUpdatePreferencesHandler.execute.mock.calls[0];
      expect(command).toBeInstanceOf(UpdatePreferencesCommand);
      expect(command).toMatchObject({
        userId,
        emailEnabled: false,
        smsEnabled: undefined,
        marketingEnabled: true,
        eventRemindersEnabled: undefined,
      });
      expect(response.body).toEqual({
        userId,
        emailEnabled: false,
        smsEnabled: true,
        marketingEnabled: true,
        eventRemindersEnabled: true,
      });
    });
  });

  describe('Authentication', () => {
    it.each([
      [
        'GET',
        '/api/notifications/me',
        '/api/notifications/me',
        mockGetUserNotificationsHandler,
      ],
      [
        'GET',
        '/api/notifications/:id',
        `/api/notifications/${notificationId}`,
        mockGetByIdHandler,
      ],
      [
        'GET',
        '/api/notifications/preferences/me',
        '/api/notifications/preferences/me',
        mockGetUserPreferencesHandler,
      ],
      [
        'PUT',
        '/api/notifications/preferences/me',
        '/api/notifications/preferences/me',
        mockUpdatePreferencesHandler,
      ],
    ])(
      'should return 401 for %s %s without a bearer token',
      async (method, _route, path, routeHandler) => {
        const server = request(app.getHttpServer());

        const response = await (method === 'PUT'
          ? server.put(path).send({ emailEnabled: false })
          : server.get(path));

        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
        expect(response.body).toMatchObject({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Authentication required',
        });
        expect(routeHandler.execute).not.toHaveBeenCalled();
      },
    );
  });
});
