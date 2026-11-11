import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'crypto';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import QRCode from 'qrcode';

import type { MfaCryptoPort } from '../../application/ports/mfa-crypto.port';

const ISSUER = 'Tickr';
const STEP_SECONDS = 30;
const DIGITS = 6;
/** Accept the previous and next 30 s step to absorb clock drift. */
const DRIFT_STEPS = 1;
const SECRET_BYTES = 20;
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
/** Unambiguous alphabet for recovery codes (no 0/O, 1/I/L). */
const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const RECOVERY_LENGTH = 10;
const CIPHER_VERSION = 'v1';

export function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) throw new Error('Invalid base32 secret');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** RFC 4226 HOTP value for one counter. */
export function hotp(key: Buffer, counter: number, digits = DIGITS): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(message).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, '0');
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * MFA Crypto Service
 *
 * - TOTP per RFC 6238 (SHA-1, 6 digits, 30 s), compatible with Google
 *   Authenticator, Microsoft Authenticator, 1Password, Aegis…
 * - Secrets encrypted at rest with AES-256-GCM.
 * - Recovery codes stored as HMAC-SHA256 digests (high-entropy codes).
 *
 * Keys come from MFA_ENCRYPTION_KEY (32 bytes, base64 or hex). Without it, a
 * key is derived from JWT_SECRET so local environments work; rotating
 * JWT_SECRET then invalidates enrolled authenticators.
 */
@Injectable()
export class MfaCryptoService implements MfaCryptoPort {
  private readonly logger = new Logger(MfaCryptoService.name);
  private readonly encryptionKey: Buffer;
  private readonly recoveryKey: Buffer;

  constructor(configService: ConfigService) {
    const configured = configService.get<string>('MFA_ENCRYPTION_KEY');
    let material: Buffer;
    if (configured) {
      material = /^[0-9a-f]{64}$/i.test(configured)
        ? Buffer.from(configured, 'hex')
        : Buffer.from(configured, 'base64');
      if (material.length !== 32) {
        throw new Error('MFA_ENCRYPTION_KEY must be 32 bytes (base64 or 64 hex characters)');
      }
    } else {
      material = Buffer.from(configService.getOrThrow<string>('JWT_SECRET'));
      if (configService.get<string>('NODE_ENV') === 'production') {
        this.logger.warn(
          'MFA_ENCRYPTION_KEY is not set: deriving the MFA key from JWT_SECRET. Set a dedicated key.',
        );
      }
    }
    this.encryptionKey = Buffer.from(hkdfSync('sha256', material, 'tickr-mfa', 'secret-encryption', 32));
    this.recoveryKey = Buffer.from(hkdfSync('sha256', material, 'tickr-mfa', 'recovery-codes', 32));
  }

  generateSecret(): string {
    return base32Encode(randomBytes(SECRET_BYTES));
  }

  buildOtpauthUri(accountName: string, secret: string): string {
    const label = `${encodeURIComponent(ISSUER)}:${encodeURIComponent(accountName)}`;
    const params = new URLSearchParams({
      secret,
      issuer: ISSUER,
      algorithm: 'SHA1',
      digits: String(DIGITS),
      period: String(STEP_SECONDS),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
  }

  renderQrCode(otpauthUri: string): Promise<string> {
    return QRCode.toDataURL(otpauthUri, { errorCorrectionLevel: 'M', margin: 1, width: 240 });
  }

  matchTotp(secret: string, code: string, at: Date = new Date()): number | null {
    const normalized = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(normalized)) return null;
    const key = base32Decode(secret);
    const current = Math.floor(at.getTime() / 1000 / STEP_SECONDS);
    let matched: number | null = null;
    // Compare every candidate so timing does not reveal which step matched.
    for (let step = current - DRIFT_STEPS; step <= current + DRIFT_STEPS; step += 1) {
      if (constantTimeEquals(hotp(key, step), normalized)) matched = step;
    }
    return matched;
  }

  encryptSecret(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return [CIPHER_VERSION, iv, cipher.getAuthTag(), ciphertext]
      .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
      .join('.');
  }

  decryptSecret(encrypted: string): string {
    const [version, iv, tag, ciphertext] = encrypted.split('.');
    if (version !== CIPHER_VERSION || !iv || !tag || !ciphertext) {
      throw new Error('Unsupported MFA secret format');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(iv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  generateRecoveryCodes(count: number): string[] {
    const codes = new Set<string>();
    while (codes.size < count) {
      let raw = '';
      for (let i = 0; i < RECOVERY_LENGTH; i += 1) {
        raw += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)];
      }
      codes.add(`${raw.slice(0, 5)}-${raw.slice(5)}`);
    }
    return [...codes];
  }

  hashRecoveryCode(code: string): string | null {
    const normalized = code.toUpperCase().replace(/[\s-]/g, '');
    if (normalized.length !== RECOVERY_LENGTH) return null;
    if ([...normalized].some((char) => !RECOVERY_ALPHABET.includes(char))) return null;
    return createHmac('sha256', this.recoveryKey).update(normalized).digest('hex');
  }
}
