import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';

import type {
  AdminAccountTransactionPort,
  AdminAccountUnitOfWorkPort,
} from '../../../application/ports/admin-account-unit-of-work.port';
import type { OrganizerObligationsInterface } from '../../../application/ports/organizer-obligations.port';
import type { UserEntityPort } from '../../../application/ports/user.repository.port';
import { UserRole } from '../../../domain/value-objects/user-role.vo';
import { OrganizerObligationsAdapter } from '../../adapters/organizer-obligations.adapter';
import { UserEntity } from '../entities/user.orm-entity';
import { UserPersistenceMapper } from '../mappers/user-persistence.mapper';



/**
 * One lock for every administrative role/status mutation. A transaction-level
 * advisory lock is released automatically on commit or rollback.
 */
const ADMIN_ACCOUNTS_LOCK = 'tickr.users.admin-account-mutations';

class AdminAccountTransaction implements AdminAccountTransactionPort {
  private readonly obligations: OrganizerObligationsAdapter;

  constructor(
    private readonly manager: EntityManager,
    private readonly mapper: UserPersistenceMapper,
  ) {
    this.obligations = new OrganizerObligationsAdapter(manager);
  }

  async findUser(userId: string): Promise<UserEntityPort | null> {
    const entity = await this.manager.findOne(UserEntity, { where: { id: userId } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  countActiveAdmins(): Promise<number> {
    return this.manager.count(UserEntity, { where: { role: UserRole.ADMIN, isActive: true } });
  }

  async updateRole(userId: string, role: UserRole): Promise<void> {
    await this.manager.update(UserEntity, userId, {
      role,
      isOrganizer: role === UserRole.ORGANIZER,
      updatedAt: new Date(),
    });
  }

  async updateActiveStatus(userId: string, isActive: boolean): Promise<void> {
    await this.manager.update(UserEntity, userId, { isActive, updatedAt: new Date() });
  }

  findOrganizerObligations(organizerId: string): Promise<OrganizerObligationsInterface> {
    return this.obligations.findOpenObligations(organizerId);
  }
}

/**
 * Admin Account Unit of Work
 *
 * Runs administrative account mutations in one transaction on one connection,
 * serialized by a PostgreSQL advisory lock. Concurrent requests (stale tokens,
 * two admins demoting each other) are applied one after the other, and each
 * re-reads the state left by the previous one.
 */
@Injectable()
export class AdminAccountUnitOfWorkRepository implements AdminAccountUnitOfWorkPort {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mapper: UserPersistenceMapper,
  ) {}

  run<T>(work: (tx: AdminAccountTransactionPort) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
        ADMIN_ACCOUNTS_LOCK,
      ]);
      return work(new AdminAccountTransaction(manager, this.mapper));
    });
  }
}
