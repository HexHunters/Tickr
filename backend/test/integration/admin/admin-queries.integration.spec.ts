import { CreateEventCommand } from '@modules/events/application/commands/create-event/create-event.command';
import { CreateEventHandler } from '@modules/events/application/commands/create-event/create-event.handler';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventStatus } from '@modules/events/domain/value-objects/event-status.vo';
import { UserValidationServiceAdapter } from '@modules/events/infrastructure/adapters/user-validation.service.adapter';
import { EventOrmEntity } from '@modules/events/infrastructure/persistence/entities/event.orm-entity';
import { EventMapper } from '@modules/events/infrastructure/persistence/mappers/event.mapper';
import { TicketTypeMapper } from '@modules/events/infrastructure/persistence/mappers/ticket-type.mapper';
import { EventTypeOrmRepository } from '@modules/events/infrastructure/repositories/event.repository';
import { RefundEntity } from '@modules/payments/domain/entities/refund.entity';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';
import { RefundStatus } from '@modules/payments/domain/value-objects/refund-status.vo';
import { OrderOrmEntity } from '@modules/payments/infrastructure/persistence/entities/order.orm-entity';
import { RefundOrmEntity } from '@modules/payments/infrastructure/persistence/entities/refund.orm-entity';
import { OrderMapper } from '@modules/payments/infrastructure/persistence/mappers/order.mapper';
import { RefundMapper } from '@modules/payments/infrastructure/persistence/mappers/refund.mapper';
import { OrderTypeOrmRepository } from '@modules/payments/infrastructure/repositories/order.repository';
import { RefundTypeOrmRepository } from '@modules/payments/infrastructure/repositories/refund.repository';
import { ChangeUserRoleCommand } from '@modules/users/application/commands/change-user-role.command';
import { ChangeUserRoleHandler } from '@modules/users/application/commands/change-user-role.handler';
import { SetUserActiveStatusCommand } from '@modules/users/application/commands/set-user-active-status.command';
import { SetUserActiveStatusHandler } from '@modules/users/application/commands/set-user-active-status.handler';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';
import { OrganizerObligationsAdapter } from '@modules/users/infrastructure/adapters/organizer-obligations.adapter';
import { UserEntity } from '@modules/users/infrastructure/persistence/entities/user.orm-entity';
import { UserPersistenceMapper } from '@modules/users/infrastructure/persistence/mappers/user-persistence.mapper';
import { AdminAccountUnitOfWorkRepository } from '@modules/users/infrastructure/persistence/repositories/admin-account-unit-of-work.repository';
import { UserTypeOrmRepository } from '@modules/users/infrastructure/persistence/repositories/user.typeorm-repository';
import { Logger } from '@nestjs/common';
import { Money } from '@shared/domain/value-objects/money.vo';
import type { DataSource } from 'typeorm';

import { TestDatabaseHelper } from '../../helpers/test-database.helper';


/**
 * Back-office queries against a real PostgreSQL schema (raw grouping, sums,
 * reserved aliases, decimal columns). Needs a disposable database:
 *   NODE_ENV=test ALLOW_TEST_DATABASE_RESET=true \
 *   TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/tickr_test_admin npm run test:integration
 */
const describeWithDatabase = process.env.TEST_DATABASE_URL ? describe : describe.skip;

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describeWithDatabase('Admin back-office queries (PostgreSQL)', () => {
  let db: DataSource;
  let users: UserTypeOrmRepository;
  let events: EventTypeOrmRepository;
  let orders: OrderTypeOrmRepository;

  beforeAll(async () => {
    await TestDatabaseHelper.setup();
    db = TestDatabaseHelper.getDataSource();
    users = new UserTypeOrmRepository(db.getRepository(UserEntity), new UserPersistenceMapper());
    events = new EventTypeOrmRepository(db.getRepository(EventOrmEntity), new EventMapper(new TicketTypeMapper()));
    orders = new OrderTypeOrmRepository(db.getRepository(OrderOrmEntity), new OrderMapper());
  });

  afterAll(async () => {
    await TestDatabaseHelper.cleanup();
    await TestDatabaseHelper.teardown();
  });

  beforeEach(async () => {
    await TestDatabaseHelper.cleanup();
    const user = (n: number, email: string, first: string, last: string, role: UserRole, active = true) =>
      db.query(
        'INSERT INTO users.users (id,email,password_hash,first_name,last_name,role,is_organizer,email_verified,is_active,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8, now() - ($9 || \' minutes\')::interval)',
        [id(n), email, 'x', first, last, role, role === UserRole.ORGANIZER, active, String(n)],
      );
    await user(1, 'admin@test.tn', 'Ada', 'Admin', UserRole.ADMIN);
    await user(2, 'olfa@test.tn', 'Olfa', 'Ben Salah', UserRole.ORGANIZER);
    await user(3, 'amal@test.tn', 'Amal', 'Démo', UserRole.PARTICIPANT);
    await user(4, 'sami@test.tn', 'Sami', 'Trabelsi', UserRole.PARTICIPANT, false);

    const event = (n: number, title: string, status: EventStatus) =>
      db.query(
        `INSERT INTO events.events (id,organizer_id,title,category,status,location_address,location_city,location_country,
          start_date,end_date,total_capacity,sold_tickets,revenue_amount,revenue_currency,created_at)
         VALUES ($1,$2,$3,'CONCERT',$4,'Rue','Tunis','Tunisia',now() + interval '10 days',now() + interval '11 days',100,0,0,'TND', now() - ($5 || ' minutes')::interval)`,
        [id(100 + n), id(2), title, status, String(n)],
      );
    await event(1, 'Nuit du jazz', EventStatus.PUBLISHED);
    await event(2, 'Jazz brunch', EventStatus.DRAFT);
    await event(3, 'Théâtre annulé', EventStatus.CANCELLED);
    await event(4, 'Festival', EventStatus.PUBLISHED);

    const order = (n: number, status: OrderStatus, total: string, fee: string, buyer: string) =>
      db.query(
        `INSERT INTO payments.orders (id,user_id,event_id,status,subtotal_amount,platform_fee_amount,payment_fees_amount,total_amount,currency,expires_at,metadata,status_history,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,0,$7,'TND',now() + interval '1 hour',$8,'[]', now() - ($9 || ' minutes')::interval)`,
        [id(200 + n), buyer, n % 2 ? id(101) : id(104), status, total, fee, total, JSON.stringify({ holderEmail: 'amal@test.tn' }), String(n)],
      );
    await order(1, OrderStatus.PAID, '45.500', '2.730', id(3));
    await order(2, OrderStatus.PAID, '20.250', '1.215', id(3));
    await order(3, OrderStatus.REFUNDED, '30.000', '1.800', id(4));
    await order(4, OrderStatus.PENDING, '10.000', '0.600', id(3));
  });

  describe('users', () => {
    it('searches across email, first, last and full name, case-insensitively', async () => {
      const emails = async (search: string) =>
        (await users.search({ search }, { page: 1, limit: 20 })).data.map((u) => u.email);
      expect(await emails('OLFA@')).toEqual(['olfa@test.tn']);
      expect(await emails('ben sal')).toEqual(['olfa@test.tn']);
      expect(await emails('démo')).toEqual(['amal@test.tn']);
      expect(await emails('test.tn')).toEqual(['admin@test.tn', 'olfa@test.tn', 'amal@test.tn', 'sami@test.tn']);
      expect(await emails("%' OR 1=1 --")).toEqual([]);
    });

    it('filters by role and status and paginates newest first', async () => {
      const participants = await users.search({ role: UserRole.PARTICIPANT }, { page: 1, limit: 20 });
      expect(participants.total).toBe(2);
      expect((await users.search({ isActive: false }, {})).data.map((u) => u.email)).toEqual(['sami@test.tn']);
      const page2 = await users.search({}, { page: 2, limit: 3 });
      expect(page2).toMatchObject({ total: 4, page: 2, totalPages: 2, hasPreviousPage: true, hasNextPage: false });
      expect(page2.data.map((u) => u.email)).toEqual(['sami@test.tn']);
    });

    it('counts accounts by role and status', async () => {
      expect(await users.getStats()).toEqual({
        total: 4,
        active: 3,
        inactive: 1,
        byRole: { ADMIN: 1, ORGANIZER: 1, PARTICIPANT: 2 },
      });
    });

    it('treats typed % and _ literally', async () => {
      const total = async (search: string) => (await users.search({ search }, {})).total;
      expect(await total('_')).toBe(0);
      expect(await total('%')).toBe(0);
      expect(await total('amal@test')).toBe(1);
    });
  });

  describe('events', () => {
    it('lists every status, with status and title filters', async () => {
      const all = await events.findAll({}, { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'DESC' });
      expect(all.data.map((e) => e.title)).toEqual(['Nuit du jazz', 'Jazz brunch', 'Théâtre annulé', 'Festival']);
      const jazzDrafts = await events.findAll({ titleSearch: 'JAZZ', status: EventStatus.DRAFT }, {});
      expect(jazzDrafts.data.map((e) => e.title)).toEqual(['Jazz brunch']);
    });

    it('counts events per status, including empty statuses', async () => {
      expect(await events.countByStatus()).toEqual({ DRAFT: 1, PUBLISHED: 2, CANCELLED: 1, COMPLETED: 0 });
    });
  });

  describe('orders', () => {
    it('lists orders with filters, newest first', async () => {
      const paid = await orders.findAll({ status: OrderStatus.PAID }, 1, 20);
      expect(paid.total).toBe(2);
      expect(paid.data.map((o) => o.id)).toEqual([id(201), id(202)]);
      expect((await orders.findAll({ eventId: id(104) }, 1, 20)).total).toBe(2);
      expect((await orders.findAll({ userId: id(4) }, 1, 20)).data.map((o) => o.id)).toEqual([id(203)]);
      expect((await orders.findAll({}, 2, 3)).data.map((o) => o.id)).toEqual([id(204)]);
    });

    it('sums decimal amounts per status as numbers', async () => {
      const summary = await orders.getStatusSummary();
      expect(summary).toHaveLength(Object.values(OrderStatus).length);
      expect(summary.find((s) => s.status === OrderStatus.PAID)).toEqual({
        status: OrderStatus.PAID,
        count: 2,
        totalAmount: 65.75,
        platformFeeAmount: 3.945,
      });
      expect(summary.find((s) => s.status === OrderStatus.FAILED)).toEqual({
        status: OrderStatus.FAILED,
        count: 0,
        totalAmount: 0,
        platformFeeAmount: 0,
      });
    });
  });

  describe('admin account mutations (advisory lock)', () => {
    let changeRole: ChangeUserRoleHandler;
    let setStatus: SetUserActiveStatusHandler;
    const activeAdmins = async () =>
      Number((await db.query("SELECT COUNT(*) AS n FROM users.users WHERE role = 'ADMIN' AND is_active"))[0].n);

    beforeEach(async () => {
      const unitOfWork = new AdminAccountUnitOfWorkRepository(db, new UserPersistenceMapper());
      changeRole = new ChangeUserRoleHandler(unitOfWork);
      setStatus = new SetUserActiveStatusHandler(unitOfWork);
      await db.query(
        "INSERT INTO users.users (id,email,password_hash,first_name,last_name,role,email_verified,is_active) VALUES ($1,'badr@test.tn','x','Badr','Admin','ADMIN',true,true)",
        [id(5)],
      );
      jest.spyOn(Logger.prototype, 'log').mockImplementation();
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    });

    afterEach(() => jest.restoreAllMocks());

    it('persists role (with the legacy organizer flag) and status', async () => {
      expect((await changeRole.execute(new ChangeUserRoleCommand(id(1), id(3), UserRole.ORGANIZER))).isSuccess).toBe(true);
      expect((await setStatus.execute(new SetUserActiveStatusCommand(id(1), id(3), false))).isSuccess).toBe(true);
      const [row] = await db.query('SELECT role, is_organizer, is_active FROM users.users WHERE id = $1', [id(3)]);
      expect(row).toEqual({ role: 'ORGANIZER', is_organizer: true, is_active: false });
    });

    it('rejects a suspended administrator acting with a stale token', async () => {
      await db.query('UPDATE users.users SET is_active = false WHERE id = $1', [id(5)]);

      const result = await changeRole.execute(new ChangeUserRoleCommand(id(5), id(1), UserRole.PARTICIPANT));

      expect(result.isFailure && result.error.type).toBe('ACTOR_NOT_AUTHORIZED');
      expect(await activeAdmins()).toBe(1);
    });

    it.each([
      ['cross-demotion', (a: string, b: string) => changeRole.execute(new ChangeUserRoleCommand(a, b, UserRole.PARTICIPANT))],
      ['cross-suspension', (a: string, b: string) => setStatus.execute(new SetUserActiveStatusCommand(a, b, false))],
    ])('simultaneous %s always leaves one active administrator (20 rounds)', async (_case, act) => {
      for (let round = 0; round < 20; round += 1) {
        await db.query("UPDATE users.users SET role = 'ADMIN', is_active = true WHERE id IN ($1, $2)", [id(1), id(5)]);

        const results = await Promise.all([act(id(1), id(5)), act(id(5), id(1))]);

        expect(results.filter((r) => r.isSuccess)).toHaveLength(1);
        expect(await activeAdmins()).toBe(1);
      }
    });
  });

  describe('organizer obligations (Events and Payments tables)', () => {
    const insertEvent = (eventId: string, organizerId: string, status: EventStatus) =>
      db.query(
        `INSERT INTO events.events (id,organizer_id,title,category,status,location_address,location_city,location_country,
          start_date,end_date,total_capacity,sold_tickets,revenue_amount,revenue_currency)
         VALUES ($1,$2,'Extra','CONCERT',$3,'Rue','Tunis','Tunisia',now() - interval '10 days',now() - interval '9 days',10,0,0,'TND')`,
        [eventId, organizerId, status],
      );
    const insertOrder = (orderId: string, eventId: string, status: OrderStatus) =>
      db.query(
        `INSERT INTO payments.orders (id,user_id,event_id,status,subtotal_amount,platform_fee_amount,payment_fees_amount,total_amount,currency,expires_at,status_history)
         VALUES ($1,$2,$3,$4,10,0,0,10,'TND',now(),'[]')`,
        [orderId, id(3), eventId, status],
      );

    it('counts open events, owed orders and pending refunds for one organizer only', async () => {
      // Seed: organizer id(2) owns 101/104 PUBLISHED, 102 DRAFT, 103 CANCELLED; order 204 is PENDING.
      await insertOrder(id(301), id(103), OrderStatus.PAID); // paid on a cancelled event: refund owed
      await insertOrder(id(302), id(103), OrderStatus.REFUNDED); // settled
      await insertEvent(id(110), id(2), EventStatus.COMPLETED);
      await insertOrder(id(303), id(110), OrderStatus.PAID); // completed event: settled
      await insertOrder(id(304), id(110), OrderStatus.PROCESSING); // payment in flight
      await db.query(
        "INSERT INTO payments.refunds (id,order_id,amount_value,amount_currency,reason,status) VALUES ($1,$2,10,'TND','x','PENDING'), ($3,$4,10,'TND','x','FAILED')",
        [id(401), id(201), id(402), id(202)],
      );
      // Another organizer's data must not count.
      await insertEvent(id(120), id(1), EventStatus.DRAFT);
      await insertOrder(id(305), id(120), OrderStatus.PENDING);

      const obligations = await new OrganizerObligationsAdapter(db.manager).findOpenObligations(id(2));

      expect(obligations).toEqual({ openEvents: 3, unsettledOrders: 3, pendingRefunds: 1 });
      expect(await new OrganizerObligationsAdapter(db.manager).findOpenObligations(id(3))).toEqual({
        openEvents: 0,
        unsettledOrders: 0,
        pendingRefunds: 0,
      });
    });

    it('blocks demotion with those counts and keeps the organizer role', async () => {
      const handler = new ChangeUserRoleHandler(new AdminAccountUnitOfWorkRepository(db, new UserPersistenceMapper()));

      const result = await handler.execute(new ChangeUserRoleCommand(id(1), id(2), UserRole.PARTICIPANT));

      expect(result.isFailure && result.error).toMatchObject({
        type: 'ORGANIZER_HAS_OPEN_OBLIGATIONS',
        obligations: { openEvents: 3, unsettledOrders: 1, pendingRefunds: 0 },
      });
      const [row] = await db.query('SELECT role FROM users.users WHERE id = $1', [id(2)]);
      expect(row.role).toBe('ORGANIZER');
    });
  });

  describe('refund claims (partial unique index)', () => {
    const refunds = () => new RefundTypeOrmRepository(db.getRepository(RefundOrmEntity), new RefundMapper());
    const newRefund = () => RefundEntity.create({ orderId: id(201), amount: Money.create(10, 'TND'), reason: 'x' });

    it('lets exactly one of many concurrent claims win, and releases on failure', async () => {
      const repository = refunds();
      const claims = await Promise.all(Array.from({ length: 8 }, () => repository.claim(newRefund())));
      expect(claims.filter(Boolean)).toHaveLength(1);

      const [open] = await repository.findByOrderId(id(201));
      open.markAsFailed();
      await repository.save(open);
      const retry = newRefund();
      expect(await repository.claim(retry)).toBe(true);

      retry.markAsCompleted('re_1');
      await repository.save(retry);
      expect(await repository.claim(newRefund())).toBe(false);
      const rows = await db.query('SELECT status FROM payments.refunds WHERE order_id = $1 ORDER BY created_at', [id(201)]);
      expect(rows.map((r: { status: RefundStatus }) => r.status).sort()).toEqual(['COMPLETED', 'FAILED']);
    });
  });

  describe('demotion racing event creation', () => {
    it('never leaves a participant owning a newly created event (25 rounds)', async () => {
      const organizerId = id(6);
      await db.query(
        "INSERT INTO users.users (id,email,password_hash,first_name,last_name,role,is_organizer,email_verified,is_active) VALUES ($1,'new@test.tn','x','New','Organizer','ORGANIZER',true,true,true)",
        [organizerId],
      );
      const changeRole = new ChangeUserRoleHandler(new AdminAccountUnitOfWorkRepository(db, new UserPersistenceMapper()));
      const createEvent = new CreateEventHandler(
        events,
        new UserValidationServiceAdapter(users),
        { publishFromAggregate: jest.fn() } as never,
      );
      for (const level of ['log', 'warn', 'debug'] as const) jest.spyOn(Logger.prototype, level).mockImplementation();
      const outcomes = { demoted: 0, created: 0, both_refused: 0 };

      for (let round = 0; round < 25; round += 1) {
        await db.query('DELETE FROM events.events WHERE organizer_id = $1', [organizerId]);
        await db.query("UPDATE users.users SET role = 'ORGANIZER', is_organizer = true WHERE id = $1", [organizerId]);
        const start = new Date(Date.now() + 30 * 86_400_000);

        const [demotion, creation] = await Promise.all([
          changeRole.execute(new ChangeUserRoleCommand(id(1), organizerId, UserRole.PARTICIPANT)),
          createEvent.execute(
            new CreateEventCommand(organizerId, `Race ${round}`, EventCategory.CONCERT, { city: 'Tunis', country: 'Tunisia' }, start, new Date(start.getTime() + 3_600_000)),
          ),
        ]);

        const [{ role }] = await db.query('SELECT role FROM users.users WHERE id = $1', [organizerId]);
        const [{ n }] = await db.query(
          "SELECT COUNT(*) AS n FROM events.events WHERE organizer_id = $1 AND status IN ('DRAFT','PUBLISHED')",
          [organizerId],
        );
        // The invariant: a participant never owns an open event.
        expect(role === 'PARTICIPANT' && Number(n) > 0).toBe(false);
        // And the API outcome matches the stored state.
        expect(demotion.isSuccess).toBe(role === 'PARTICIPANT');
        expect(creation.isSuccess).toBe(Number(n) === 1);
        if (demotion.isSuccess) outcomes.demoted += 1;
        else if (creation.isSuccess) outcomes.created += 1;
        else outcomes.both_refused += 1;
      }
      // How the races resolved (varies by timing); the invariant held in every round.
      process.stdout.write(`demotion/creation race outcomes: ${JSON.stringify(outcomes)}\n`);
      jest.restoreAllMocks();
    });
  });
});
