import type { UserRole } from '../../domain/value-objects/user-role.vo';

import type { OrganizerObligationsInterface } from './organizer-obligations.port';
import type { UserEntityPort } from './user.repository.port';

/**
 * Reads and writes available inside one administrative transaction.
 * Every read reflects the state at the time it runs inside the lock.
 */
export interface AdminAccountTransactionPort {
  findUser(userId: string): Promise<UserEntityPort | null>;
  countActiveAdmins(): Promise<number>;
  updateRole(userId: string, role: UserRole): Promise<void>;
  updateActiveStatus(userId: string, isActive: boolean): Promise<void>;
  findOrganizerObligations(organizerId: string): Promise<OrganizerObligationsInterface>;
}

/**
 * Serializes every administrative change to roles and account status.
 *
 * `run` executes the work in a single transaction while holding one lock
 * shared by all role/status mutations (across application instances), so
 * checks such as "the actor is still an active admin" or "an active admin
 * remains" cannot be invalidated by a concurrent mutation before commit.
 */
export interface AdminAccountUnitOfWorkPort {
  run<T>(work: (tx: AdminAccountTransactionPort) => Promise<T>): Promise<T>;
}

export const ADMIN_ACCOUNT_UNIT_OF_WORK = Symbol('ADMIN_ACCOUNT_UNIT_OF_WORK');
