import { CancelEventHandler } from '@modules/events/application/commands/cancel-event/cancel-event.handler';
import { EVENT_STAFF_USER_DIRECTORY } from '@modules/events/application/ports/event-staff-user-directory.port';
import { EVENT_REPOSITORY } from '@modules/events/application/ports/event.repository.port';
import { USER_VALIDATION_SERVICE } from '@modules/events/application/ports/user-validation.service.port';
import { GetAdminEventsHandler } from '@modules/events/application/queries/get-admin-events/get-admin-events.handler';
import { GetEventStatusCountsHandler } from '@modules/events/application/queries/get-event-status-counts/get-event-status-counts.handler';
import { EventEntity } from '@modules/events/domain/entities/event.entity';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventDateRangeVO } from '@modules/events/domain/value-objects/event-date-range.vo';
import { EventStatus } from '@modules/events/domain/value-objects/event-status.vo';
import { LocationVO } from '@modules/events/domain/value-objects/location.vo';
import { AdminEventsController } from '@modules/events/infrastructure/controllers/admin-events.controller';
import { RequestRefundHandler } from '@modules/payments/application/commands/request-refund/request-refund.handler';
import { PAYMENT_EVENT_QUERY_PORT } from '@modules/payments/application/ports/event-query.port';
import { ORDER_REPOSITORY } from '@modules/payments/application/ports/order.repository.port';
import { PAYMENT_PROVIDER_FACTORY } from '@modules/payments/application/ports/payment-provider.port';
import { REFUND_REPOSITORY } from '@modules/payments/application/ports/refund.repository.port';
import { TICKET_RESERVATION_PORT } from '@modules/payments/application/ports/ticket-reservation.port';
import { GetAdminOrdersHandler } from '@modules/payments/application/queries/get-admin-orders/get-admin-orders.handler';
import { GetOrderStatusSummaryHandler } from '@modules/payments/application/queries/get-order-status-summary/get-order-status-summary.handler';
import { OrderEntity } from '@modules/payments/domain/entities/order.entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';
import { PaymentMethod } from '@modules/payments/domain/value-objects/payment-method.vo';
import { AdminOrdersController } from '@modules/payments/infrastructure/controllers/admin-orders.controller';
import { ChangeUserRoleHandler } from '@modules/users/application/commands/change-user-role.handler';
import { SetUserActiveStatusHandler } from '@modules/users/application/commands/set-user-active-status.handler';
import { UserMapper } from '@modules/users/application/mappers/user.mapper';
import { USER_REPOSITORY } from '@modules/users/application/ports/user.repository.port';
import type { UserEntityPort, UserSearchFilters } from '@modules/users/application/ports/user.repository.port';
import { GetUserStatsHandler } from '@modules/users/application/queries/get-user-stats.handler';
import { SearchUsersHandler } from '@modules/users/application/queries/search-users.handler';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';
import { AdminUsersController } from '@modules/users/infrastructure/controllers/admin-users.controller';
import { AuthController } from '@modules/users/infrastructure/controllers/auth.controller';
import { JwtAuthGuard } from '@modules/users/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/users/infrastructure/guards/roles.guard';
import { VerificationTokenRepository } from '@modules/users/infrastructure/persistence/repositories/verification-token.repository';
import { JwtTokenService } from '@modules/users/infrastructure/services/jwt.service';
import { PasswordService } from '@modules/users/infrastructure/services/password.service';
import { JwtStrategy } from '@modules/users/infrastructure/strategies/jwt.strategy';
import { LocalStrategy } from '@modules/users/infrastructure/strategies/local.strategy';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule, ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';
import request from 'supertest';
import { App } from 'supertest/types';


const PASSWORD = 'AdminE2e!2026';
const ids = {
  admin: '00000000-0000-4000-8000-0000000000a1',
  organizer: '00000000-0000-4000-8000-0000000000b1',
  participant: '00000000-0000-4000-8000-0000000000c1',
  draft: '00000000-0000-4000-8000-0000000000d1',
  published: '00000000-0000-4000-8000-0000000000d2',
  paidOrder: '00000000-0000-4000-8000-0000000000e1',
  pendingOrder: '00000000-0000-4000-8000-0000000000e2',
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
  async findByIds(userIds: string[]) {
    return userIds.flatMap((id) => (this.users.has(id) ? [this.users.get(id)!] : []));
  }
  async updateLastLogin(id: string) {
    const user = this.users.get(id);
    if (user) this.users.set(id, { ...user, lastLoginAt: new Date() });
  }
  async updateRole(id: string, role: UserRole) {
    this.users.set(id, { ...this.users.get(id)!, role, updatedAt: new Date() });
  }
  async updateActiveStatus(id: string, isActive: boolean) {
    this.users.set(id, { ...this.users.get(id)!, isActive, updatedAt: new Date() });
  }
  async search(filters: UserSearchFilters, options?: { page?: number; limit?: number }) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const term = filters.search?.toLowerCase();
    const matches = [...this.users.values()].filter(
      (u) =>
        (!term || `${u.email} ${u.firstName} ${u.lastName}`.toLowerCase().includes(term)) &&
        (!filters.role || u.role === filters.role) &&
        (filters.isActive === undefined || u.isActive === filters.isActive),
    );
    const totalPages = Math.ceil(matches.length / limit);
    return {
      data: matches.slice((page - 1) * limit, page * limit),
      total: matches.length,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
  async getStats() {
    const all = [...this.users.values()];
    const count = (role: UserRole) => all.filter((u) => u.role === role).length;
    const active = all.filter((u) => u.isActive).length;
    return {
      total: all.length,
      active,
      inactive: all.length - active,
      byRole: {
        [UserRole.ADMIN]: count(UserRole.ADMIN),
        [UserRole.ORGANIZER]: count(UserRole.ORGANIZER),
        [UserRole.PARTICIPANT]: count(UserRole.PARTICIPANT),
      },
    };
  }
}

function createEvent(id: string, title: string): EventEntity {
  const startDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
  const event = EventEntity.create({
    organizerId: ids.organizer,
    title,
    category: EventCategory.CONCERT,
    location: LocationVO.create({ city: 'Tunis', country: 'Tunisia' }),
    dateRange: EventDateRangeVO.create(startDate, new Date(startDate.getTime() + 3_600_000), true),
  }).value;
  Object.assign(event, { _id: id });
  event.pullDomainEvents();
  return event;
}

function createOrder(id: string, status: OrderStatus): OrderEntity {
  return OrderEntity.reconstitute({
    id,
    userId: ids.participant,
    eventId: ids.published,
    items: [],
    status,
    subtotalAmount: 40,
    platformFeeAmount: 2,
    paymentFeesAmount: 1,
    totalAmount: 43,
    currency: 'TND',
    paymentMethod: PaymentMethod.STRIPE,
    paymentGatewayOrderId: null,
    paymentIntentId: 'pi_e2e',
    gatewayPaymentRef: 'pi_e2e',
    transactionId: 'txn_e2e',
    paidAt: status === OrderStatus.PAID ? new Date() : null,
    refundedAt: null,
    refundReason: null,
    expiresAt: new Date(Date.now() + 600_000),
    metadata: { holderFirstName: 'Amal', holderLastName: 'Démo', holderEmail: 'amal@e2e.tn', ticketIds: ['t-1'] },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('E2E: Admin back office', () => {
  let app: INestApplication<App>;
  let throttleStorage: ThrottlerStorageService;
  let users: InMemoryUsers;
  let events: Map<string, EventEntity>;
  let orders: Map<string, OrderEntity>;
  const gatewayRefund = jest.fn();
  const cancelTickets = jest.fn();

  beforeAll(async () => {
    users = new InMemoryUsers();
    events = new Map();
    orders = new Map();
    const eventRepository = {
      findById: async (id: string) => events.get(id) ?? null,
      save: async (event: EventEntity) => {
        events.set(event.id, event);
        return event;
      },
      findAll: async (filters?: { status?: EventStatus; titleSearch?: string }) => {
        const data = [...events.values()].filter(
          (e) =>
            (!filters?.status || e.status === filters.status) &&
            (!filters?.titleSearch || e.title.toLowerCase().includes(filters.titleSearch.toLowerCase())),
        );
        return { data, total: data.length, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false };
      },
      countByStatus: async () => {
        const counts = { DRAFT: 0, PUBLISHED: 0, CANCELLED: 0, COMPLETED: 0 } as Record<EventStatus, number>;
        for (const event of events.values()) counts[event.status] += 1;
        return counts;
      },
    };
    const orderRepository = {
      findById: async (id: string) => orders.get(id) ?? null,
      save: async (order: OrderEntity) => {
        orders.set(order.id, order);
        return order;
      },
      findAll: async (filters: { status?: OrderStatus }, page: number, limit: number) => {
        const data = [...orders.values()].filter((o) => !filters.status || o.status === filters.status);
        return { data: data.slice((page - 1) * limit, page * limit), total: data.length };
      },
      getStatusSummary: async () =>
        Object.values(OrderStatus).map((status) => {
          const matching = [...orders.values()].filter((o) => o.status === status);
          return {
            status,
            count: matching.length,
            totalAmount: matching.reduce((sum, o) => sum + o.totalAmount, 0),
            platformFeeAmount: matching.reduce((sum, o) => sum + o.platformFeeAmount, 0),
          };
        }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ JWT_SECRET: 'admin-e2e-secret-key-minimum-32-characters', JWT_ACCESS_EXPIRATION: '15m', BCRYPT_ROUNDS: 4 })],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: 'admin-e2e-secret-key-minimum-32-characters' }),
        EventEmitterModule.forRoot(),
        ThrottlerModule.forRoot([
          { name: 'short', ttl: 1000, limit: 3 },
          { name: 'medium', ttl: 10000, limit: 20 },
          { name: 'long', ttl: 60000, limit: 100 },
        ]),
      ],
      controllers: [AuthController, AdminUsersController, AdminEventsController, AdminOrdersController],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: USER_REPOSITORY, useValue: users },
        { provide: VerificationTokenRepository, useValue: {} },
        UserMapper,
        JwtTokenService,
        PasswordService,
        LocalStrategy,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        SearchUsersHandler,
        GetUserStatsHandler,
        ChangeUserRoleHandler,
        SetUserActiveStatusHandler,
        { provide: EVENT_REPOSITORY, useValue: eventRepository },
        {
          provide: EVENT_STAFF_USER_DIRECTORY,
          useValue: { getUsersByIds: (userIds: string[]) => users.findByIds(userIds) },
        },
        {
          provide: USER_VALIDATION_SERVICE,
          useValue: {
            hasRole: async (userId: string, role: string) => (await users.findById(userId))?.role === role,
            isEventOwner: (userId: string, organizerId: string) => userId === organizerId,
          },
        },
        { provide: DOMAIN_EVENT_PUBLISHER, useValue: { publishFromAggregate: jest.fn() } },
        GetAdminEventsHandler,
        GetEventStatusCountsHandler,
        CancelEventHandler,
        { provide: ORDER_REPOSITORY, useValue: orderRepository },
        { provide: REFUND_REPOSITORY, useValue: { save: async (refund: unknown) => refund, findByOrderId: async () => [] } },
        {
          provide: PAYMENT_PROVIDER_FACTORY,
          useValue: {
            getSupportedMethods: () => [PaymentMethod.STRIPE],
            getProvider: () => ({ refund: gatewayRefund }),
          },
        },
        {
          provide: TICKET_RESERVATION_PORT,
          useValue: { reserveTickets: jest.fn(), confirmTickets: jest.fn(), cancelReservations: cancelTickets },
        },
        {
          provide: PAYMENT_EVENT_QUERY_PORT,
          useValue: {
            getEventById: async (id: string) => {
              const event = events.get(id);
              return event ? { id, title: event.title, status: event.status, startDate: new Date(), organizerId: ids.organizer, commissionRateOverride: null } : null;
            },
            getTicketType: async () => null,
          },
        },
        { provide: DomainEventPublisher, useValue: { publish: jest.fn(), publishMany: jest.fn(), publishFromAggregate: jest.fn() } },
        GetAdminOrdersHandler,
        GetOrderStatusSummaryHandler,
        RequestRefundHandler,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    throttleStorage = moduleFixture.get<ThrottlerStorageService>(ThrottlerStorage);
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }),
    );
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    throttleStorage.onApplicationShutdown();
    throttleStorage.storage.clear();
    gatewayRefund.mockReset().mockResolvedValue({ success: true, refundId: 're_e2e', amount: 41 });
    cancelTickets.mockReset();
    const passwordHash = await app.get(PasswordService).hash(PASSWORD);
    users.users.clear();
    const seed = (id: string, email: string, firstName: string, role: UserRole) =>
      users.users.set(id, {
        id,
        email,
        firstName,
        lastName: 'E2E',
        role,
        phone: null,
        isActive: true,
        emailVerified: true,
        passwordHash,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    seed(ids.admin, 'admin@e2e.tn', 'Ada', UserRole.ADMIN);
    seed(ids.organizer, 'organizer@e2e.tn', 'Olfa', UserRole.ORGANIZER);
    seed(ids.participant, 'participant@e2e.tn', 'Amal', UserRole.PARTICIPANT);
    events.clear();
    events.set(ids.draft, createEvent(ids.draft, 'Brouillon secret'));
    const published = createEvent(ids.published, 'Nuit du jazz');
    events.set(ids.published, published);
    orders.clear();
    orders.set(ids.paidOrder, createOrder(ids.paidOrder, OrderStatus.PAID));
    orders.set(ids.pendingOrder, createOrder(ids.pendingOrder, OrderStatus.PENDING));
  });

  const http = () => request(app.getHttpServer());
  async function login(email: string) {
    const response = await http().post('/api/auth/login').send({ email, password: PASSWORD }).expect(HttpStatus.OK);
    return response.body as { accessToken: string; refreshToken: string };
  }
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  describe('access control', () => {
    const routes: Array<['get' | 'patch' | 'post', string]> = [
      ['get', '/api/admin/users'],
      ['get', '/api/admin/users/stats'],
      ['patch', `/api/admin/users/${ids.participant}/role`],
      ['patch', `/api/admin/users/${ids.participant}/status`],
      ['get', '/api/admin/events'],
      ['get', '/api/admin/events/stats'],
      ['post', `/api/admin/events/${ids.published}/cancel`],
      ['get', '/api/admin/orders'],
      ['get', '/api/admin/orders/stats'],
      ['post', `/api/admin/orders/${ids.paidOrder}/refund`],
    ];

    it.each(routes)('%s %s requires authentication', async (method, path) => {
      await http()[method](path).expect(HttpStatus.UNAUTHORIZED);
    });

    it.each(routes)('%s %s refuses organizers and participants', async (method, path) => {
      const organizer = await login('organizer@e2e.tn');
      const participant = await login('participant@e2e.tn');
      await http()[method](path).set(bearer(organizer.accessToken)).expect(HttpStatus.FORBIDDEN);
      await http()[method](path).set(bearer(participant.accessToken)).expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('accounts', () => {
    it('searches, filters and counts accounts', async () => {
      const { accessToken } = await login('admin@e2e.tn');
      const all = await http().get('/api/admin/users?page=1&limit=10').set(bearer(accessToken)).expect(200);
      expect(all.body.total).toBe(3);
      expect(all.body.data[0]).not.toHaveProperty('passwordHash');

      const search = await http().get('/api/admin/users?search=OLFA').set(bearer(accessToken)).expect(200);
      expect(search.body.data.map((u: { email: string }) => u.email)).toEqual(['organizer@e2e.tn']);

      const byRole = await http().get('/api/admin/users?role=PARTICIPANT&status=active').set(bearer(accessToken)).expect(200);
      expect(byRole.body.total).toBe(1);

      const stats = await http().get('/api/admin/users/stats').set(bearer(accessToken)).expect(200);
      expect(stats.body).toEqual({ total: 3, active: 3, inactive: 0, byRole: { ADMIN: 1, ORGANIZER: 1, PARTICIPANT: 1 } });
    });

    it('rejects invalid filters and bodies', async () => {
      const { accessToken } = await login('admin@e2e.tn');
      await http().get('/api/admin/users?role=ROOT').set(bearer(accessToken)).expect(400);
      await http().get('/api/admin/users?limit=500').set(bearer(accessToken)).expect(400);
      await http().get('/api/admin/users/not-a-uuid').set(bearer(accessToken)).expect(400);
      await http().patch(`/api/admin/users/${ids.participant}/role`).set(bearer(accessToken)).send({ role: 'ROOT' }).expect(400);
      await http().patch(`/api/admin/users/${ids.participant}/status`).set(bearer(accessToken)).send({ isActive: 'nope' }).expect(400);
      await http().patch(`/api/admin/users/${ids.participant}/status`).set(bearer(accessToken)).send({ isActive: 'false' }).expect(400);
      expect(users.users.get(ids.participant)?.isActive).toBe(true);
      await http().patch(`/api/admin/users/${ids.participant}/status`).set(bearer(accessToken)).send({ isActive: false, extra: 1 }).expect(400);
    });

    it('returns 404 for unknown accounts', async () => {
      const { accessToken } = await login('admin@e2e.tn');
      const unknown = '00000000-0000-4000-8000-000000000999';
      await http().get(`/api/admin/users/${unknown}`).set(bearer(accessToken)).expect(404);
      await http().patch(`/api/admin/users/${unknown}/role`).set(bearer(accessToken)).send({ role: 'ADMIN' }).expect(404);
    });

    it('promotes a participant, whose next refreshed token carries the new role', async () => {
      const admin = await login('admin@e2e.tn');
      const participant = await login('participant@e2e.tn');

      const response = await http()
        .patch(`/api/admin/users/${ids.participant}/role`)
        .set(bearer(admin.accessToken))
        .send({ role: 'ORGANIZER' })
        .expect(200);
      expect(response.body).toMatchObject({ id: ids.participant, role: 'ORGANIZER', isActive: true });

      const refreshed = await http().post('/api/auth/refresh-token').send({ refreshToken: participant.refreshToken }).expect(200);
      const payload = JSON.parse(Buffer.from(refreshed.body.accessToken.split('.')[1], 'base64url').toString());
      expect(payload.role).toBe('ORGANIZER');
    });

    it('never lets an administrator demote or suspend themselves', async () => {
      const { accessToken } = await login('admin@e2e.tn');
      const role = await http().patch(`/api/admin/users/${ids.admin}/role`).set(bearer(accessToken)).send({ role: 'PARTICIPANT' }).expect(403);
      expect(role.body.code ?? role.body.message?.code).toBeDefined();
      await http().patch(`/api/admin/users/${ids.admin}/status`).set(bearer(accessToken)).send({ isActive: false }).expect(403);
      expect(users.users.get(ids.admin)).toMatchObject({ role: UserRole.ADMIN, isActive: true });
    });

    it('suspension blocks login and session refresh until reactivation', async () => {
      const admin = await login('admin@e2e.tn');
      const participant = await login('participant@e2e.tn');

      await http().patch(`/api/admin/users/${ids.participant}/status`).set(bearer(admin.accessToken)).send({ isActive: false }).expect(200);
      await http().post('/api/auth/login').send({ email: 'participant@e2e.tn', password: PASSWORD }).expect(401);
      await http().post('/api/auth/refresh-token').send({ refreshToken: participant.refreshToken }).expect(401);

      const suspended = await http().get('/api/admin/users?status=inactive').set(bearer(admin.accessToken)).expect(200);
      expect(suspended.body.data.map((u: { id: string }) => u.id)).toEqual([ids.participant]);

      await http().patch(`/api/admin/users/${ids.participant}/status`).set(bearer(admin.accessToken)).send({ isActive: true }).expect(200);
      await http().post('/api/auth/refresh-token').send({ refreshToken: participant.refreshToken }).expect(200);
    });
  });

  describe('events', () => {
    it('lists every status with organizer identity and status counts', async () => {
      const { accessToken } = await login('admin@e2e.tn');
      const list = await http().get('/api/admin/events').set(bearer(accessToken)).expect(200);
      expect(list.body.total).toBe(2);
      expect(list.body.data[0].organizer).toEqual({ id: ids.organizer, name: 'Olfa E2E', email: 'organizer@e2e.tn' });

      const drafts = await http().get('/api/admin/events?status=DRAFT&search=secret').set(bearer(accessToken)).expect(200);
      expect(drafts.body.data.map((e: { id: string }) => e.id)).toEqual([ids.draft]);

      await http().get('/api/admin/events?status=LIVE').set(bearer(accessToken)).expect(400);
      const stats = await http().get('/api/admin/events/stats').set(bearer(accessToken)).expect(200);
      expect(stats.body).toEqual({ DRAFT: 2, PUBLISHED: 0, CANCELLED: 0, COMPLETED: 0 });
    });

    it('cancels another organizer\'s event once, with a reason', async () => {
      const { accessToken } = await login('admin@e2e.tn');
      await http().post(`/api/admin/events/${ids.draft}/cancel`).set(bearer(accessToken)).send({}).expect(400);

      await http()
        .post(`/api/admin/events/${ids.draft}/cancel`)
        .set(bearer(accessToken))
        .send({ reason: 'Contenu non conforme' })
        .expect(200);
      expect(events.get(ids.draft)).toMatchObject({ status: EventStatus.CANCELLED, cancellationReason: 'Contenu non conforme' });

      await http().post(`/api/admin/events/${ids.draft}/cancel`).set(bearer(accessToken)).send({ reason: 'Again' }).expect(400);
      await http()
        .post('/api/admin/events/00000000-0000-4000-8000-000000000999/cancel')
        .set(bearer(accessToken))
        .send({ reason: 'Missing' })
        .expect(404);
    });

    it('re-checks the admin role in the handler even with an admin token', async () => {
      const { accessToken } = await login('admin@e2e.tn');
      // Role revoked after the token was issued: the handler must refuse.
      await users.updateRole(ids.admin, UserRole.PARTICIPANT);
      await http().post(`/api/admin/events/${ids.published}/cancel`).set(bearer(accessToken)).send({ reason: 'x' }).expect(403);
      expect(events.get(ids.published)?.status).toBe(EventStatus.DRAFT);
    });
  });

  describe('orders', () => {
    it('lists orders with buyer and event title, and summarizes by status', async () => {
      const { accessToken } = await login('admin@e2e.tn');
      const list = await http().get('/api/admin/orders?status=PAID').set(bearer(accessToken)).expect(200);
      expect(list.body).toMatchObject({ total: 1, page: 1, totalPages: 1 });
      expect(list.body.data[0]).toMatchObject({
        id: ids.paidOrder,
        eventTitle: 'Nuit du jazz',
        buyerName: 'Amal Démo',
        buyerEmail: 'amal@e2e.tn',
        total: 43,
        platformFee: 2,
      });
      await http().get('/api/admin/orders?status=SHIPPED').set(bearer(accessToken)).expect(400);

      const stats = await http().get('/api/admin/orders/stats').set(bearer(accessToken)).expect(200);
      expect(stats.body).toEqual(
        expect.arrayContaining([
          { status: 'PAID', count: 1, totalAmount: 43, platformFeeAmount: 2 },
          { status: 'PENDING', count: 1, totalAmount: 43, platformFeeAmount: 2 },
        ]),
      );
    });

    it('refunds another buyer\'s paid order without the platform fee, exactly once', async () => {
      const { accessToken } = await login('admin@e2e.tn');
      await http().post(`/api/admin/orders/${ids.paidOrder}/refund`).set(bearer(accessToken)).send({}).expect(400);

      const refund = await http()
        .post(`/api/admin/orders/${ids.paidOrder}/refund`)
        .set(bearer(accessToken))
        .send({ reason: 'Geste commercial' })
        .expect(200);
      expect(refund.body).toMatchObject({ status: 'COMPLETED' });
      expect(gatewayRefund).toHaveBeenCalledWith('pi_e2e', expect.objectContaining({ amount: 41 }));
      expect(cancelTickets).toHaveBeenCalledWith(['t-1']);
      expect(orders.get(ids.paidOrder)?.status).toBe(OrderStatus.REFUNDED);

      await http().post(`/api/admin/orders/${ids.paidOrder}/refund`).set(bearer(accessToken)).send({ reason: 'Twice' }).expect(400);
      await http().post(`/api/admin/orders/${ids.pendingOrder}/refund`).set(bearer(accessToken)).send({ reason: 'Not paid' }).expect(400);
      expect(gatewayRefund).toHaveBeenCalledTimes(1);
    });

    it('leaves the order paid when the gateway declines', async () => {
      gatewayRefund.mockResolvedValue({ success: false });
      const { accessToken } = await login('admin@e2e.tn');
      await http().post(`/api/admin/orders/${ids.paidOrder}/refund`).set(bearer(accessToken)).send({ reason: 'Declined' }).expect(400);
      expect(orders.get(ids.paidOrder)?.status).toBe(OrderStatus.PAID);
      expect(cancelTickets).not.toHaveBeenCalled();
    });
  });

  it.each([
    ['users', '/api/admin/users?page='],
    ['events', '/api/admin/events?page='],
    ['orders', '/api/admin/orders?page='],
  ])('lets an administrator page through %s faster than the default 3 req/s', async (_name, path) => {
    const { accessToken } = await login('admin@e2e.tn');
    const statuses: number[] = [];
    for (let page = 1; page <= 6; page += 1) {
      statuses.push((await http().get(`${path}${page}`).set(bearer(accessToken))).status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 200]);
  });
});
