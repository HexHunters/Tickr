import 'server-only'

import { cookies } from 'next/headers'
import { z } from 'zod'

import { backendUrl } from '@/lib/api/server'

export async function sessionToken(): Promise<string | undefined> {
  const jar = await cookies()
  return jar.get('tickr_access')?.value
}

export async function refreshSession(): Promise<string | undefined> {
  const jar = await cookies()
  const refreshToken = jar.get('tickr_refresh')?.value
  if (!refreshToken) return undefined
  const response = await fetch(backendUrl('auth/refresh-token'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) return undefined
  const body: unknown = await response.json()
  const result = z
    .object({ accessToken: z.string(), expiresIn: z.number() })
    .safeParse(body)
  if (!result.success) return undefined
  jar.set('tickr_access', result.data.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: result.data.expiresIn,
  })
  return result.data.accessToken
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}
