import type {
  MfaFailureInterface,
  MfaRepositoryPort,
  MfaStateInterface,
} from '@modules/users/application/ports/mfa.repository.port';

type MutableState = { -readonly [K in keyof MfaStateInterface]: MfaStateInterface[K] };

/** Same compare-and-set semantics as MfaTypeOrmRepository. */
export class InMemoryMfaRepository implements MfaRepositoryPort {
  readonly states = new Map<string, MutableState>();
  readonly codes = new Map<string, Array<{ hash: string; usedAt: Date | null }>>();
  now = () => new Date();

  async getState(userId: string) {
    const state = this.states.get(userId);
    return state ? { ...state } : null;
  }
  async savePendingSecret(userId: string, secretEncrypted: string) {
    const state = this.states.get(userId);
    if (state?.enabledAt) return false;
    this.states.set(userId, {
      userId,
      secretEncrypted: null,
      enabledAt: null,
      lastUsedStep: null,
      failedAttempts: 0,
      lockedUntil: null,
      ...state,
      pendingSecretEncrypted: secretEncrypted,
    });
    return true;
  }
  async enable(userId: string, expected: string, step: number, hashes: string[]) {
    const state = this.states.get(userId);
    if (!state || state.enabledAt || state.pendingSecretEncrypted !== expected) return false;
    Object.assign(state, {
      secretEncrypted: expected,
      pendingSecretEncrypted: null,
      enabledAt: this.now(),
      lastUsedStep: step,
      failedAttempts: 0,
      lockedUntil: null,
    });
    await this.replaceRecoveryCodes(userId, hashes);
    return true;
  }
  async recordTotpSuccess(userId: string, step: number) {
    const state = this.states.get(userId);
    if (!state?.enabledAt || (state.lastUsedStep !== null && state.lastUsedStep >= step)) return false;
    Object.assign(state, { lastUsedStep: step, failedAttempts: 0, lockedUntil: null });
    return true;
  }
  async consumeRecoveryCode(userId: string, hash: string) {
    const code = this.codes.get(userId)?.find((c) => c.hash === hash && !c.usedAt);
    if (!code) return false;
    code.usedAt = this.now();
    return true;
  }
  async clearFailures(userId: string) {
    const state = this.states.get(userId);
    if (state) Object.assign(state, { failedAttempts: 0, lockedUntil: null });
  }
  async recordFailure(userId: string, max: number, lockSeconds: number): Promise<MfaFailureInterface> {
    const state = this.states.get(userId);
    if (!state) return { failedAttempts: 0, lockedUntil: null };
    state.failedAttempts += 1;
    if (state.failedAttempts >= max) state.lockedUntil = new Date(this.now().getTime() + lockSeconds * 1000);
    return { failedAttempts: state.failedAttempts, lockedUntil: state.lockedUntil };
  }
  async replaceRecoveryCodes(userId: string, hashes: string[]) {
    this.codes.set(userId, hashes.map((hash) => ({ hash, usedAt: null })));
  }
  async countRemainingRecoveryCodes(userId: string) {
    return (this.codes.get(userId) ?? []).filter((c) => !c.usedAt).length;
  }
  async reset(userId: string) {
    this.states.delete(userId);
    this.codes.delete(userId);
  }
}
