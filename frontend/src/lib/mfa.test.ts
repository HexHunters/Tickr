import { describe, expect, it } from 'vitest'

import { loginResultSchema } from '@/lib/api/mfa-contracts'
import { ApiError } from '@/lib/api/request'
import {
  formatSecret,
  isChallengeExpired,
  mfaError,
  normalizeTotpInput,
  recoveryCodesFile,
} from '@/lib/mfa'

describe('two-factor helpers', () => {
  it('keeps only the six digits of a typed or pasted code', () => {
    expect(normalizeTotpInput('123 456')).toBe('123456')
    expect(normalizeTotpInput('12-34-56-78')).toBe('123456')
    expect(normalizeTotpInput('abc')).toBe('')
  })

  it('groups the manual key by four characters', () => {
    expect(formatSecret('JBSWY3DPEHPK3PXP')).toBe('JBSW Y3DP EHPK 3PXP')
    expect(formatSecret('ABCDEF')).toBe('ABCD EF')
  })

  it('writes a recovery-code file with the account and every code', () => {
    const file = recoveryCodesFile(
      ['ABCDE-FGHJK', 'MNPQR-STUVW'],
      'admin@tickr.tn',
      new Date('2026-11-11T12:00:00Z'),
    )
    expect(file).toContain('Compte : admin@tickr.tn')
    expect(file).toContain('Générés le : 2026-11-11')
    expect(file).toMatch(/ABCDE-FGHJK\nMNPQR-STUVW\n$/)
  })

  it('explains each refusal in French and spots an expired sign-in', () => {
    const expired = new ApiError(401, 'MFA_CHALLENGE_EXPIRED', 'Sign-in expired')
    expect(mfaError(new ApiError(401, 'INVALID_MFA_CODE', 'Invalid code'))).toMatch(
      /ne correspond pas/,
    )
    expect(mfaError(new ApiError(429, 'MFA_LOCKED', 'Too many'))).toMatch(
      /15 minutes/,
    )
    expect(mfaError(expired)).toMatch(/mot de passe/)
    expect(isChallengeExpired(expired)).toBe(true)
    expect(
      isChallengeExpired(new ApiError(401, 'INVALID_MFA_CODE', 'Invalid code')),
    ).toBe(false)
    expect(mfaError(new ApiError(400, '', 'code must be 6 digits'))).toMatch(
      /6 chiffres/,
    )
  })

  it('reads a login answer as a session or a second-factor step', () => {
    const user = {
      id: 'u1',
      email: 'a@b.tn',
      firstName: 'A',
      lastName: 'B',
      role: 'ADMIN',
    }
    expect(loginResultSchema.parse({ user })).toEqual({ user })
    expect(
      loginResultSchema.parse({ mfaRequired: true, mfaMethod: 'ENROLL' }),
    ).toEqual({ mfaRequired: true, mfaMethod: 'ENROLL' })
    expect(() =>
      loginResultSchema.parse({ mfaRequired: true, mfaMethod: 'SMS' }),
    ).toThrow()
  })
})
