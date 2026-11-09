import { ChangeUserRoleCommand } from '@modules/users/application/commands/change-user-role.command';
import { ChangeUserRoleHandler } from '@modules/users/application/commands/change-user-role.handler';
import { SetUserActiveStatusCommand } from '@modules/users/application/commands/set-user-active-status.command';
import { SetUserActiveStatusHandler } from '@modules/users/application/commands/set-user-active-status.handler';
import type {
  AdminAccountTransactionPort,
  AdminAccountUnitOfWorkPort,
} from '@modules/users/application/ports/admin-account-unit-of-work.port';
import type { OrganizerObligationsInterface } from '@modules/users/application/ports/organizer-obligations.port';
import type { UserEntityPort, UserRepositoryPort } from '@modules/users/application/ports/user.repository.port';
import { SearchUsersHandler } from '@modules/users/application/queries/search-users.handler';
import { SearchUsersQuery } from '@modules/users/application/queries/search-users.query';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';
import { Logger } from '@nestjs/common';


const NONE: OrganizerObligationsInterface = { openEvents: 0, unsettledOrders: 0, pendingRefunds: 0 };

/** Yields to the event loop so unserialized work would interleave. */
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

/**
 * In-memory unit of work. `run` serializes like the real advisory lock;
 * every read and write yields, so concurrency bugs are not hidden by
 * synchronous execution.
 */
class InMemoryAdminAccounts implements AdminAccountUnitOfWorkPort {
  readonly users = new Map<string, UserEntityPort>();
  readonly obligations = jest.fn<Promise<OrganizerObligationsInterface>, [string]>(async () => NONE);
  readonly countActiveAdmins = jest.fn(async () => {
    await tick();
    return [...this.users.values()].filter((u) => u.role === UserRole.ADMIN && u.isActive).length;
  });
  readonly writes: string[] = [];
  private queue: Promise<unknown> = Promise.resolve();

  private readonly tx: AdminAccountTransactionPort = {
    findUser: async (id) => {
      await tick();
      const user = this.users.get(id);
      return user ? { ...user } : null;
    },
    countActiveAdmins: () => this.countActiveAdmins(),
    updateRole: async (id, role) => {
      await tick();
      this.writes.push(`role:${id}:${role}`);
      this.users.set(id, { ...this.users.get(id)!, role });
    },
    updateActiveStatus: async (id, isActive) => {
      await tick();
      this.writes.push(`status:${id}:${isActive}`);
      this.users.set(id, { ...this.users.get(id)!, isActive });
    },
    findOrganizerObligations: (id) => this.obligations(id),
  };

  run<T>(work: (tx: AdminAccountTransactionPort) => Promise<T>): Promise<T> {
    const next = this.queue.then(() => work(this.tx));
    this.queue = next.catch(() => undefined);
    return next;
  }

  add(id: string, role: UserRole, isActive = true): void {
    this.users.set(id, {
      id,
      email: `${id}@test.tn`,
      firstName: id,
      lastName: 'Test',
      role,
      phone: null,
      isActive,
      lastLoginAt: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    });
  }

  activeAdmins(): string[] {
    return [...this.users.values()]
      .filter((u) => u.role === UserRole.ADMIN && u.isActive)
      .map((u) => u.id);
  }
}

describe('Back-office user management', () => {
  let accounts: InMemoryAdminAccounts;
  let changeRole: ChangeUserRoleHandler;
  let setStatus: SetUserActiveStatusHandler;

  beforeEach(() => {
    accounts = new InMemoryAdminAccounts();
    accounts.add('admin-a', UserRole.ADMIN);
    accounts.add('admin-b', UserRole.ADMIN);
    accounts.add('organizer', UserRole.ORGANIZER);
    accounts.add('participant', UserRole.PARTICIPANT);
    changeRole = new ChangeUserRoleHandler(accounts);
    setStatus = new SetUserActiveStatusHandler(accounts);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  const role = (actor: string, target: string, next: UserRole) =>
    changeRole.execute(new ChangeUserRoleCommand(actor, target, next));
  const status = (actor: string, target: string, isActive: boolean) =>
    setStatus.execute(new SetUserActiveStatusCommand(actor, target, isActive));

  describe('ChangeUserRoleHandler', () => {
    it('promotes a participant to organizer', async () => {
      const result = await role('admin-a', 'participant', UserRole.ORGANIZER);

      expect(result.isSuccess).toBe(true);
      expect(result.value.role).toBe(UserRole.ORGANIZER);
      expect(accounts.writes).toEqual(['role:participant:ORGANIZER']);
    });

    it('does not write when the role is unchanged', async () => {
      const result = await role('admin-a', 'participant', UserRole.PARTICIPANT);

      expect(result.isSuccess).toBe(true);
      expect(accounts.writes).toEqual([]);
    });

    it('refuses to let an administrator change their own role', async () => {
      const result = await role('admin-a', 'admin-a', UserRole.PARTICIPANT);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('SELF_MODIFICATION');
      expect(accounts.writes).toEqual([]);
    });

    it('fails for an unknown user', async () => {
      const result = await role('admin-a', 'missing', UserRole.ADMIN);

      expect(result.error.type).toBe('USER_NOT_FOUND');
    });

    it.each([
      ['suspended', (a: InMemoryAdminAccounts) => a.add('admin-b', UserRole.ADMIN, false)],
      ['demoted', (a: InMemoryAdminAccounts) => a.add('admin-b', UserRole.PARTICIPANT)],
      ['deleted', (a: InMemoryAdminAccounts) => a.users.delete('admin-b')],
    ])('rejects a %s administrator still holding an admin token', async (_state, revoke) => {
      revoke(accounts);

      const result = await role('admin-b', 'admin-a', UserRole.PARTICIPANT);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('ACTOR_NOT_AUTHORIZED');
      expect(accounts.users.get('admin-a')!.role).toBe(UserRole.ADMIN);
      expect(accounts.writes).toEqual([]);
    });

    it('never demotes the last active administrator', async () => {
      // Defensive guard: the actor is an active admin, so this needs an inconsistent count to trigger.
      accounts.countActiveAdmins.mockResolvedValueOnce(1);

      const result = await role('admin-a', 'admin-b', UserRole.ORGANIZER);

      expect(result.error.type).toBe('LAST_ACTIVE_ADMIN');
      expect(accounts.writes).toEqual([]);
    });

    it.each([
      ['open events', { ...NONE, openEvents: 2 }],
      ['unsettled orders', { ...NONE, unsettledOrders: 1 }],
      ['pending refunds', { ...NONE, pendingRefunds: 1 }],
    ])('refuses to demote an organizer with %s, with actionable counts', async (_kind, obligations) => {
      accounts.obligations.mockResolvedValue(obligations);

      const result = await role('admin-a', 'organizer', UserRole.PARTICIPANT);

      expect(result.isFailure).toBe(true);
      expect(result.error).toMatchObject({ type: 'ORGANIZER_HAS_OPEN_OBLIGATIONS', obligations });
      expect(accounts.obligations).toHaveBeenCalledWith('organizer');
      expect(accounts.users.get('organizer')!.role).toBe(UserRole.ORGANIZER);
    });

    it('applies the same rule to an administrator who owns events', async () => {
      accounts.obligations.mockResolvedValue({ ...NONE, openEvents: 1 });

      const result = await role('admin-a', 'admin-b', UserRole.PARTICIPANT);

      expect(result.error.type).toBe('ORGANIZER_HAS_OPEN_OBLIGATIONS');
    });

    it('does not check obligations when event ownership is kept', async () => {
      accounts.obligations.mockResolvedValue({ ...NONE, openEvents: 3 });

      const toAdmin = await role('admin-a', 'organizer', UserRole.ADMIN);
      const backToOrganizer = await role('admin-a', 'organizer', UserRole.ORGANIZER);

      expect(toAdmin.isSuccess && backToOrganizer.isSuccess).toBe(true);
      expect(accounts.obligations).not.toHaveBeenCalled();
    });

    it('demotes an organizer whose events are all closed and settled', async () => {
      const result = await role('admin-a', 'organizer', UserRole.PARTICIPANT);

      expect(result.isSuccess).toBe(true);
      expect(accounts.users.get('organizer')!.role).toBe(UserRole.PARTICIPANT);
      // Checked before the write and verified again after commit.
      expect(accounts.obligations).toHaveBeenCalledTimes(2);
    });

    it('reverts the demotion when an event was created concurrently', async () => {
      accounts.obligations
        .mockResolvedValueOnce(NONE) // check inside the transaction
        .mockResolvedValueOnce({ ...NONE, openEvents: 1 }); // a draft committed meanwhile

      const result = await role('admin-a', 'organizer', UserRole.PARTICIPANT);

      expect(result.isFailure).toBe(true);
      expect(result.error).toMatchObject({
        type: 'ORGANIZER_HAS_OPEN_OBLIGATIONS',
        obligations: { openEvents: 1 },
      });
      expect(accounts.users.get('organizer')!.role).toBe(UserRole.ORGANIZER);
      expect(accounts.writes).toEqual(['role:organizer:PARTICIPANT', 'role:organizer:ORGANIZER']);
    });

    it('does not overwrite a newer role change while reverting', async () => {
      accounts.obligations.mockResolvedValueOnce(NONE).mockImplementationOnce(async (id) => {
        // Another administrator promoted the account between the two checks.
        accounts.users.set(id, { ...accounts.users.get(id)!, role: UserRole.ADMIN });
        return { ...NONE, openEvents: 1 };
      });

      const result = await role('admin-a', 'organizer', UserRole.PARTICIPANT);

      expect(result.error.type).toBe('ORGANIZER_HAS_OPEN_OBLIGATIONS');
      expect(accounts.users.get('organizer')!.role).toBe(UserRole.ADMIN);
    });

    it('reports persistence failures', async () => {
      jest.spyOn(accounts, 'run').mockRejectedValueOnce(new Error('db down'));

      const result = await role('admin-a', 'participant', UserRole.ORGANIZER);

      expect(result.error.type).toBe('PERSISTENCE_ERROR');
    });
  });

  describe('SetUserActiveStatusHandler', () => {
    it('suspends and reactivates an account', async () => {
      const suspended = await status('admin-a', 'participant', false);
      const reactivated = await status('admin-a', 'participant', true);

      expect(suspended.value.isActive).toBe(false);
      expect(reactivated.value.isActive).toBe(true);
      expect(accounts.writes).toEqual(['status:participant:false', 'status:participant:true']);
    });

    it('is idempotent', async () => {
      const result = await status('admin-a', 'participant', true);

      expect(result.isSuccess).toBe(true);
      expect(accounts.writes).toEqual([]);
    });

    it('suspends an organizer immediately, even with open obligations', async () => {
      accounts.obligations.mockResolvedValue({ ...NONE, openEvents: 4, unsettledOrders: 2 });

      const result = await status('admin-a', 'organizer', false);

      expect(result.isSuccess).toBe(true);
      expect(accounts.users.get('organizer')!.isActive).toBe(false);
      expect(accounts.obligations).not.toHaveBeenCalled();
    });

    it('refuses to let an administrator suspend themselves', async () => {
      const result = await status('admin-a', 'admin-a', false);

      expect(result.error.type).toBe('SELF_MODIFICATION');
    });

    it('fails for an unknown user', async () => {
      const result = await status('admin-a', 'missing', false);

      expect(result.error.type).toBe('USER_NOT_FOUND');
    });

    it('rejects a suspended administrator still holding an admin token', async () => {
      accounts.add('admin-b', UserRole.ADMIN, false);

      const result = await status('admin-b', 'admin-a', false);

      expect(result.error.type).toBe('ACTOR_NOT_AUTHORIZED');
      expect(accounts.users.get('admin-a')!.isActive).toBe(true);
    });

    it('never suspends the last active administrator', async () => {
      accounts.countActiveAdmins.mockResolvedValueOnce(1);

      const result = await status('admin-a', 'admin-b', false);

      expect(result.error.type).toBe('LAST_ACTIVE_ADMIN');
      expect(accounts.users.get('admin-b')!.isActive).toBe(true);
    });
  });

  describe('concurrent administrators', () => {
    it.each([
      ['cross-demotion', () => [role('admin-a', 'admin-b', UserRole.PARTICIPANT), role('admin-b', 'admin-a', UserRole.PARTICIPANT)]],
      ['cross-suspension', () => [status('admin-a', 'admin-b', false), status('admin-b', 'admin-a', false)]],
      ['demotion against suspension', () => [role('admin-a', 'admin-b', UserRole.ORGANIZER), status('admin-b', 'admin-a', false)]],
    ])('%s leaves exactly one active administrator', async (_case, start) => {
      const results = await Promise.all(start() as Array<Promise<{ isSuccess: boolean; isFailure: boolean; error?: { type: string } }>>);

      expect(results.filter((r) => r.isSuccess)).toHaveLength(1);
      expect(results.find((r) => r.isFailure)!.error!.type).toBe('ACTOR_NOT_AUTHORIZED');
      expect(accounts.activeAdmins()).toHaveLength(1);
    });

    it('two admins demoting each other while a third watches keeps the platform administrable', async () => {
      accounts.add('admin-c', UserRole.ADMIN);

      await Promise.all([
        role('admin-a', 'admin-b', UserRole.PARTICIPANT),
        role('admin-b', 'admin-c', UserRole.PARTICIPANT),
        role('admin-c', 'admin-a', UserRole.PARTICIPANT),
      ]);

      expect(accounts.activeAdmins().length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('SearchUsersHandler', () => {
    it('passes filters through and maps users to profiles', async () => {
      const user = accounts.users.get('participant')!;
      const repository = {
        search: jest.fn().mockResolvedValue({
          data: [user],
          total: 1,
          page: 2,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: true,
        }),
      } as unknown as jest.Mocked<UserRepositoryPort>;
      const handler = new SearchUsersHandler(repository);

      const result = await handler.execute(
        new SearchUsersQuery({ search: 'amal', role: UserRole.PARTICIPANT, isActive: true }, 2, 10),
      );

      expect(repository.search).toHaveBeenCalledWith(
        { search: 'amal', role: UserRole.PARTICIPANT, isActive: true },
        { page: 2, limit: 10 },
      );
      expect(result.total).toBe(1);
      expect(result.data[0]).toMatchObject({ id: user.id, email: user.email, isActive: true });
    });
  });
});
