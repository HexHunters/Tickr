import { EventStatus } from '@modules/events/domain/value-objects/event-status.vo';
import { EventOrmEntity } from '@modules/events/infrastructure/persistence/entities/event.orm-entity';
import { EventMapper } from '@modules/events/infrastructure/persistence/mappers/event.mapper';
import { TicketTypeMapper } from '@modules/events/infrastructure/persistence/mappers/ticket-type.mapper';
import { EventTypeOrmRepository } from '@modules/events/infrastructure/repositories/event.repository';
import { OrderStatus } from '@modules/payments/domain/value-objects/order-status.vo';
import { OrderOrmEntity } from '@modules/payments/infrastructure/persistence/entities/order.orm-entity';
import { OrderMapper } from '@modules/payments/infrastructure/persistence/mappers/order.mapper';
import { OrderTypeOrmRepository } from '@modules/payments/infrastructure/repositories/order.repository';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';
import { UserEntity } from '@modules/users/infrastructure/persistence/entities/user.orm-entity';
import { UserPersistenceMapper } from '@modules/users/infrastructure/persistence/mappers/user-persistence.mapper';
import { UserTypeOrmRepository } from '@modules/users/infrastructure/persistence/repositories/user.typeorm-repository';
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

    it('updates role with the legacy organizer flag, and active status', async () => {
      await users.updateRole(id(3), UserRole.ORGANIZER);
      await users.updateActiveStatus(id(3), false);
      const [row] = await db.query('SELECT role, is_organizer, is_active FROM users.users WHERE id = $1', [id(3)]);
      expect(row).toEqual({ role: 'ORGANIZER', is_organizer: true, is_active: false });
      await users.updateRole(id(3), UserRole.PARTICIPANT);
      const [after] = await db.query('SELECT is_organizer FROM users.users WHERE id = $1', [id(3)]);
      expect(after.is_organizer).toBe(false);
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
});
