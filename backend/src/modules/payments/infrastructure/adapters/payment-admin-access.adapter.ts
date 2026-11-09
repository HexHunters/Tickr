import { USER_REPOSITORY } from '@modules/users/application/ports/user.repository.port';
import type { UserRepositoryPort } from '@modules/users/application/ports/user.repository.port';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';
import { Inject, Injectable } from '@nestjs/common';

import type { PaymentAdminAccessPort } from '../../application/ports/payment-admin-access.port';

/**
 * Payment Admin Access Adapter
 *
 * Anti-corruption layer reading the current account state from the Users context.
 */
@Injectable()
export class PaymentAdminAccessAdapter implements PaymentAdminAccessPort {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepositoryPort,
  ) {}

  async isActiveAdmin(userId: string): Promise<boolean> {
    const user = await this.users.findById(userId);
    return Boolean(user && user.isActive && user.role === UserRole.ADMIN);
  }
}
