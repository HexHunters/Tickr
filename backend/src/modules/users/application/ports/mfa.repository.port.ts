/**
 * Second-factor (TOTP) state of one account. Secrets are stored encrypted.
 */
export interface MfaStateInterface {
  readonly userId: string;
  /** Encrypted active secret; null until enrollment is confirmed */
  readonly secretEncrypted: string | null;
  /** Encrypted secret shown during enrollment, not yet confirmed */
  readonly pendingSecretEncrypted: string | null;
  readonly enabledAt: Date | null;
  /** Last accepted TOTP time step, to refuse replays */
  readonly lastUsedStep: number | null;
  readonly failedAttempts: number;
  readonly lockedUntil: Date | null;
}

export interface MfaFailureInterface {
  readonly failedAttempts: number;
  readonly lockedUntil: Date | null;
}

/**
 * MFA Repository Port
 *
 * Every write that guards a security decision is a single conditional
 * statement, so concurrent requests cannot both succeed (replayed code,
 * reused recovery code, double enrollment).
 */
export interface MfaRepositoryPort {
  getState(userId: string): Promise<MfaStateInterface | null>;

  /** Stores a new pending secret unless MFA is already enabled. */
  savePendingSecret(userId: string, secretEncrypted: string): Promise<boolean>;

  /**
   * Enables MFA with the pending secret the user just proved, if it is still
   * the pending one and MFA is not enabled yet, and stores the recovery code
   * hashes in the same transaction.
   */
  enable(
    userId: string,
    expectedPendingSecret: string,
    acceptedStep: number,
    recoveryCodeHashes: string[],
  ): Promise<boolean>;

  /** Accepts a TOTP step only if it is newer than the last accepted one. */
  recordTotpSuccess(userId: string, step: number): Promise<boolean>;

  /** Marks one unused recovery code as used. */
  consumeRecoveryCode(userId: string, codeHash: string): Promise<boolean>;

  clearFailures(userId: string): Promise<void>;

  /** Counts a failed attempt and locks the factor once the limit is reached. */
  recordFailure(
    userId: string,
    maxAttempts: number,
    lockSeconds: number,
  ): Promise<MfaFailureInterface>;

  replaceRecoveryCodes(userId: string, codeHashes: string[]): Promise<void>;

  countRemainingRecoveryCodes(userId: string): Promise<number>;

  /** Removes the factor and its recovery codes (operator recovery). */
  reset(userId: string): Promise<void>;
}

export const MFA_REPOSITORY = Symbol('MFA_REPOSITORY');
