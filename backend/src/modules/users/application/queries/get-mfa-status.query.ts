import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { UserRole } from '../../domain/value-objects/user-role.vo';

export type MfaStatus = {
  readonly enabled: boolean;
  readonly enabledAt: Date | null;
  readonly required: boolean;
  readonly remainingRecoveryCodes: number;
};

/**
 * Second-factor status of the signed-in account
 */
export class GetMfaStatusQuery extends BaseQuery<MfaStatus> {
  constructor(
    public readonly userId: string,
    public readonly role: UserRole,
  ) {
    super();
    Object.freeze(this);
  }
}
