import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { authSchema, userSchema } from '@/lib/api/contracts'
import { mfaSetupSchema } from '@/lib/api/mfa-contracts'
import { backendUrl } from '@/lib/api/server'
import {
  isSameOrigin,
  refreshSession,
  sessionToken,
} from '@/lib/api/session-server'

import type { NextRequest } from 'next/server'

type CookieJar = Awaited<ReturnType<typeof cookies>>

/** Second-factor steps: backend path, and the body fields the browser may send. */
const MFA_ACTIONS: Record<string, { path: string; fields: string[] }> = {
  'mfa-enroll-start': { path: 'auth/mfa/enroll/start', fields: [] },
  'mfa-enroll-confirm': { path: 'auth/mfa/enroll/confirm', fields: ['code'] },
  'mfa-verify': { path: 'auth/mfa/verify', fields: ['code', 'recoveryCode'] },
}

// Holds the password-step proof until the second factor succeeds. HttpOnly and
// scoped to these routes: page scripts never see it.
const MFA_COOKIE = 'tickr_mfa'
const MFA_COOKIE_PATH = '/api/auth'

const noStore = { 'Cache-Control': 'no-store' }

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  } as const
}

function openSession(
  jar: CookieJar,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number },
) {
  jar.set('tickr_access', tokens.accessToken, {
    ...cookieOptions(),
    maxAge: tokens.expiresIn,
  })
  // Session cookie: its actual validity is always checked by the backend.
  jar.set('tickr_refresh', tokens.refreshToken, cookieOptions())
  jar.delete({ name: MFA_COOKIE, path: MFA_COOKIE_PATH })
}

async function forwardMfaStep(
  request: NextRequest,
  jar: CookieJar,
  action: string,
): Promise<NextResponse> {
  const step = MFA_ACTIONS[action]
  const mfaToken = jar.get(MFA_COOKIE)?.value
  if (!mfaToken)
    return NextResponse.json(
      {
        code: 'MFA_CHALLENGE_EXPIRED',
        message:
          'Votre connexion a expiré. Saisissez à nouveau votre mot de passe.',
      },
      { status: 401, headers: noStore },
    )
  const input: unknown = await request.json().catch(() => ({}))
  const fields = Object.fromEntries(
    step.fields.flatMap((field) => {
      const value = (input as Record<string, unknown> | null)?.[field]
      return typeof value === 'string' ? [[field, value]] : []
    }),
  )
  const upstream = await fetch(backendUrl(step.path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mfaToken, ...fields }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  })
  const body: unknown = await upstream.json().catch(() => null)
  if (!upstream.ok) {
    const code = (body as { code?: unknown } | null)?.code
    if (code === 'MFA_CHALLENGE_EXPIRED')
      jar.delete({ name: MFA_COOKIE, path: MFA_COOKIE_PATH })
    return NextResponse.json(body, {
      status: upstream.status,
      headers: noStore,
    })
  }
  if (action === 'mfa-enroll-start') {
    const setup = mfaSetupSchema.safeParse(body)
    return setup.success
      ? NextResponse.json(setup.data, { headers: noStore })
      : NextResponse.json(
          { message: 'Configuration momentanément indisponible.' },
          { status: 502 },
        )
  }
  const session = authSchema
    .extend({
      recoveryCodes: z.array(z.string()).optional(),
      remainingRecoveryCodes: z.number().optional(),
    })
    .safeParse(body)
  if (!session.success)
    return NextResponse.json(
      { message: 'Connexion momentanément indisponible.' },
      { status: 502 },
    )
  openSession(jar, session.data)
  return NextResponse.json(
    {
      user: session.data.user,
      recoveryCodes: session.data.recoveryCodes,
      remainingRecoveryCodes: session.data.remainingRecoveryCodes,
    },
    { headers: noStore },
  )
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  if (!isSameOrigin(request))
    return NextResponse.json({ message: 'Origine refusée.' }, { status: 403 })
  const { action } = await context.params
  const jar = await cookies()
  if (action === 'logout') {
    jar.delete('tickr_access')
    jar.delete('tickr_refresh')
    jar.delete({ name: MFA_COOKIE, path: MFA_COOKIE_PATH })
    return NextResponse.json({ message: 'Déconnecté.' })
  }
  if (action in MFA_ACTIONS) {
    try {
      return await forwardMfaStep(request, jar, action)
    } catch {
      return NextResponse.json(
        { message: 'Le service est momentanément indisponible.' },
        { status: 503 },
      )
    }
  }
  if (
    ![
      'login',
      'register',
      'verify-email',
      'resend-verification',
      'request-reset',
      'reset-password',
    ].includes(action)
  )
    return NextResponse.json(
      { message: 'Route indisponible.' },
      { status: 404 },
    )
  try {
    const upstream = await fetch(backendUrl(`auth/${action}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: await request.text(),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
    const body: unknown = await upstream.json()
    if (action === 'login' && upstream.ok) {
      const challenge = z
        .object({
          mfaRequired: z.literal(true),
          mfaMethod: z.enum(['ENROLL', 'VERIFY']),
          mfaToken: z.string(),
          expiresIn: z.number(),
        })
        .safeParse(body)
      if (challenge.success) {
        // Password accepted; no session until the second factor succeeds.
        jar.delete('tickr_access')
        jar.delete('tickr_refresh')
        jar.set(MFA_COOKIE, challenge.data.mfaToken, {
          ...cookieOptions(),
          sameSite: 'strict',
          path: MFA_COOKIE_PATH,
          maxAge: challenge.data.expiresIn,
        })
        return NextResponse.json(
          { mfaRequired: true, mfaMethod: challenge.data.mfaMethod },
          { headers: noStore },
        )
      }
      const result = authSchema.safeParse(body)
      if (!result.success)
        return NextResponse.json(
          { message: 'Connexion momentanément indisponible.' },
          { status: 502 },
        )
      openSession(jar, result.data)
      return NextResponse.json({ user: result.data.user }, { headers: noStore })
    }
    return NextResponse.json(body, {
      status: upstream.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json(
      { message: 'Le service est momentanément indisponible.' },
      { status: 503 },
    )
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  if ((await context.params).action !== 'session')
    return NextResponse.json(
      { message: 'Route indisponible.' },
      { status: 404 },
    )
  try {
    let token = await sessionToken()
    if (!token) token = await refreshSession()
    if (!token)
      return NextResponse.json(
        { user: null },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    const send = () =>
      fetch(backendUrl('users/me'), {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      })
    let response = await send()
    if (response.status === 401) {
      token = await refreshSession()
      if (token) response = await send()
    }
    if (response.status === 401)
      return NextResponse.json(
        { user: null },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    if (!response.ok)
      return NextResponse.json(
        { message: 'Profil indisponible.' },
        { status: response.status },
      )
    const result = userSchema.safeParse(await response.json())
    if (!result.success)
      return NextResponse.json(
        { message: 'Profil indisponible.' },
        { status: 502 },
      )
    return NextResponse.json(
      { user: result.data },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      { message: 'Le service est momentanément indisponible.' },
      { status: 503 },
    )
  }
}
