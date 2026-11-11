import { z } from 'zod'

import { userSchema } from '@/lib/api/contracts'

/** POST /api/auth/login: a session, or a second-factor step to complete. */
export const loginResultSchema = z.union([
  z.object({ user: userSchema }),
  z.object({
    mfaRequired: z.literal(true),
    mfaMethod: z.enum(['ENROLL', 'VERIFY']),
  }),
])

export const mfaSetupSchema = z.object({
  secret: z.string(),
  otpauthUri: z.string(),
  qrCodeDataUrl: z.string().startsWith('data:image/'),
})

export const mfaSessionSchema = z.object({
  user: userSchema,
  recoveryCodes: z.array(z.string()).optional(),
  remainingRecoveryCodes: z.number().optional(),
})

export const mfaStatusSchema = z.object({
  enabled: z.boolean(),
  enabledAt: z.string().nullable(),
  required: z.boolean(),
  remainingRecoveryCodes: z.number(),
})

export const recoveryCodesSchema = z.object({
  recoveryCodes: z.array(z.string()),
})

export type MfaSetup = z.infer<typeof mfaSetupSchema>
export type MfaStatus = z.infer<typeof mfaStatusSchema>
