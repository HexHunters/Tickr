import { Inject, Injectable } from '@nestjs/common';

import { UserRoleVO } from '../../domain/value-objects/user-role.vo';
import { MFA_REPOSITORY } from '../ports/mfa.repository.port';
import type { MfaRepositoryPort } from '../ports/mfa.repository.port';

import { GetMfaStatusQuery } from './get-mfa-status.query';
import type { MfaStatus } from './get-mfa-status.query';

/**
 * Handler for GetMfaStatusQuery
 */
@Injectable()
export class GetMfaStatusHandler {
  constructor(@Inject(MFA_REPOSITORY) private readonly repository: MfaRepositoryPort) {}

  async execute(query: GetMfaStatusQuery): Promise<MfaStatus> {
    const state = await this.repository.getState(query.userId);
    const enabled = Boolean(state?.enabledAt);
    return {
      enabled,
      enabledAt: state?.enabledAt ?? null,
      required: UserRoleVO.fromEnum(query.role).requiresMfa(),
      remainingRecoveryCodes: enabled
        ? await this.repository.countRemainingRecoveryCodes(query.userId)
        : 0,
    };
  }
}
