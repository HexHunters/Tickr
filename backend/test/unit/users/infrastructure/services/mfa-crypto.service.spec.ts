import {
  base32Decode,
  base32Encode,
  hotp,
  MfaCryptoService,
} from '@modules/users/infrastructure/services/mfa-crypto.service';
import { ConfigService } from '@nestjs/config';

const config = (values: Record<string, string | undefined>) =>
  ({
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      if (values[key] === undefined) throw new Error(`${key} missing`);
      return values[key];
    },
  }) as unknown as ConfigService;

describe('MfaCryptoService', () => {
  const service = new MfaCryptoService(config({ JWT_SECRET: 'unit-test-jwt-secret' }));
  const rfcSecret = Buffer.from('12345678901234567890');

  describe('HOTP / TOTP (RFC 4226, RFC 6238)', () => {
    it('matches the RFC 4226 HOTP test vectors', () => {
      const expected = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
      expected.forEach((code, counter) => expect(hotp(rfcSecret, counter)).toBe(code));
    });

    it('matches the RFC 6238 SHA-1 TOTP test vectors', () => {
      const vectors: Array<[number, string]> = [
        [59, '94287082'],
        [1111111109, '07081804'],
        [1111111111, '14050471'],
        [1234567890, '89005924'],
        [2000000000, '69279037'],
        [20000000000, '65353130'],
      ];
      for (const [seconds, code] of vectors) {
        expect(hotp(rfcSecret, Math.floor(seconds / 30), 8)).toBe(code);
      }
    });

    it('encodes base32 per RFC 4648 and round-trips', () => {
      expect(base32Encode(rfcSecret)).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
      expect(base32Decode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')).toEqual(rfcSecret);
      expect(() => base32Decode('NOT-BASE32!')).toThrow();
    });

    it('generates 160-bit base32 secrets', () => {
      const secret = service.generateSecret();
      expect(secret).toMatch(/^[A-Z2-7]{32}$/);
      expect(base32Decode(secret)).toHaveLength(20);
      expect(service.generateSecret()).not.toBe(secret);
    });

    it('accepts the current step and one step of drift, and returns the matched step', () => {
      const secret = service.generateSecret();
      const at = new Date('2026-11-11T10:00:15Z');
      const step = Math.floor(at.getTime() / 30000);
      const codeAt = (s: number) => hotp(base32Decode(secret), s);

      expect(service.matchTotp(secret, codeAt(step), at)).toBe(step);
      expect(service.matchTotp(secret, codeAt(step - 1), at)).toBe(step - 1);
      expect(service.matchTotp(secret, codeAt(step + 1), at)).toBe(step + 1);
      expect(service.matchTotp(secret, codeAt(step - 2), at)).toBeNull();
      expect(service.matchTotp(secret, codeAt(step + 2), at)).toBeNull();
      expect(service.matchTotp(secret, `${codeAt(step).slice(0, 3)} ${codeAt(step).slice(3)}`, at)).toBe(step);
    });

    it.each(['', '12345', '1234567', 'abcdef', '12-345'])('rejects malformed code %p', (code) => {
      expect(service.matchTotp(service.generateSecret(), code)).toBeNull();
    });

    it('builds an otpauth URI authenticator apps understand', () => {
      const raw = service.buildOtpauthUri('admin@tickr.tn', 'JBSWY3DPEHPK3PXP');
      expect(raw.startsWith('otpauth://totp/Tickr:admin%40tickr.tn?')).toBe(true);
      const uri = new URL(raw);
      expect(uri.protocol).toBe('otpauth:');
      expect(uri.host).toBe('totp');
      expect(decodeURIComponent(uri.pathname)).toBe('/Tickr:admin@tickr.tn');
      expect(Object.fromEntries(uri.searchParams)).toEqual({
        secret: 'JBSWY3DPEHPK3PXP',
        issuer: 'Tickr',
        algorithm: 'SHA1',
        digits: '6',
        period: '30',
      });
    });

    it('renders the QR code as a PNG data URL', async () => {
      await expect(service.renderQrCode('otpauth://totp/Tickr:a?secret=JBSWY3DPEHPK3PXP')).resolves.toMatch(
        /^data:image\/png;base64,/,
      );
    });
  });

  describe('secret encryption at rest', () => {
    it('round-trips with a random IV per encryption', () => {
      const first = service.encryptSecret('JBSWY3DPEHPK3PXP');
      const second = service.encryptSecret('JBSWY3DPEHPK3PXP');
      expect(first).not.toBe(second);
      expect(first).not.toContain('JBSWY3DPEHPK3PXP');
      expect(service.decryptSecret(first)).toBe('JBSWY3DPEHPK3PXP');
    });

    it('detects tampering and refuses another key', () => {
      const encrypted = service.encryptSecret('JBSWY3DPEHPK3PXP');
      const parts = encrypted.split('.');
      parts[3] = Buffer.from('tampered').toString('base64url');
      expect(() => service.decryptSecret(parts.join('.'))).toThrow();
      const other = new MfaCryptoService(config({ JWT_SECRET: 'another-secret' }));
      expect(() => other.decryptSecret(encrypted)).toThrow();
      expect(() => service.decryptSecret('plaintext')).toThrow('Unsupported MFA secret format');
    });

    it('uses MFA_ENCRYPTION_KEY (base64 or hex) independently of JWT_SECRET', () => {
      const key = Buffer.alloc(32, 7);
      const viaBase64 = new MfaCryptoService(config({ MFA_ENCRYPTION_KEY: key.toString('base64'), JWT_SECRET: 'a' }));
      const viaHex = new MfaCryptoService(config({ MFA_ENCRYPTION_KEY: key.toString('hex'), JWT_SECRET: 'b' }));
      expect(viaHex.decryptSecret(viaBase64.encryptSecret('SECRET'))).toBe('SECRET');
      expect(() => new MfaCryptoService(config({ MFA_ENCRYPTION_KEY: 'c2hvcnQ=', JWT_SECRET: 'a' }))).toThrow(
        /32 bytes/,
      );
    });
  });

  describe('recovery codes', () => {
    it('generates unique, unambiguous XXXXX-XXXXX codes', () => {
      const codes = service.generateRecoveryCodes(10);
      expect(new Set(codes).size).toBe(10);
      for (const code of codes) expect(code).toMatch(/^[A-HJKMNP-Z2-9]{5}-[A-HJKMNP-Z2-9]{5}$/);
    });

    it('hashes the code the user types, whatever the case, spaces or hyphen', () => {
      const [code] = service.generateRecoveryCodes(1);
      const hash = service.hashRecoveryCode(code);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(service.hashRecoveryCode(code.toLowerCase())).toBe(hash);
      expect(service.hashRecoveryCode(code.replace('-', ''))).toBe(hash);
      expect(service.hashRecoveryCode(` ${code.replace('-', ' ')} `)).toBe(hash);
    });

    it.each(['', 'ABCDE', 'ABCDE-FGHJK-M', 'ABCDE-FGH1K', 'ABCDE-FGHOK'])('rejects malformed code %p', (code) => {
      expect(service.hashRecoveryCode(code)).toBeNull();
    });

    it('keys the hash with the server secret', () => {
      const [code] = service.generateRecoveryCodes(1);
      const other = new MfaCryptoService(config({ JWT_SECRET: 'another-secret' }));
      expect(other.hashRecoveryCode(code)).not.toBe(service.hashRecoveryCode(code));
    });
  });
});
