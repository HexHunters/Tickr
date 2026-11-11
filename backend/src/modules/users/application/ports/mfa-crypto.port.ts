/**
 * Cryptographic primitives for the second factor (RFC 6238 TOTP, secret
 * encryption at rest, recovery codes). Implemented in infrastructure.
 */
export interface MfaCryptoPort {
  /** Random base32 (RFC 4648) secret for an authenticator app. */
  generateSecret(): string;

  /** otpauth:// URI that authenticator apps import from a QR code. */
  buildOtpauthUri(accountName: string, secret: string): string;

  /** QR code image (data URL) for the otpauth:// URI. */
  renderQrCode(otpauthUri: string): Promise<string>;

  /**
   * Returns the time step that the 6-digit code matches, within one step of
   * clock drift, or null.
   */
  matchTotp(secret: string, code: string, at?: Date): number | null;

  encryptSecret(secret: string): string;
  decryptSecret(encrypted: string): string;

  /** One-time recovery codes, formatted for display (XXXXX-XXXXX). */
  generateRecoveryCodes(count: number): string[];

  /** Keyed hash of a recovery code typed by the user; null if malformed. */
  hashRecoveryCode(code: string): string | null;
}

export const MFA_CRYPTO = Symbol('MFA_CRYPTO');
