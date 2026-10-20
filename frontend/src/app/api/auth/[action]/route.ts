import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { authSchema, userSchema } from '@/lib/api/contracts'
import { backendUrl } from '@/lib/api/server'
import {
  isSameOrigin,
  refreshSession,
  sessionToken,
} from '@/lib/api/session-server'

import type { NextRequest } from 'next/server'

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
    return NextResponse.json({ message: 'Déconnecté.' })
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
      const result = authSchema.safeParse(body)
      if (!result.success)
        return NextResponse.json(
          { message: 'Connexion momentanément indisponible.' },
          { status: 502 },
        )
      const options = {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      } satisfies Parameters<typeof jar.set>[2]
      jar.set('tickr_access', result.data.accessToken, {
        ...options,
        maxAge: result.data.expiresIn,
      })
      // Session cookie: its actual validity is always checked by the backend.
      jar.set('tickr_refresh', result.data.refreshToken, options)
      return NextResponse.json(
        { user: result.data.user },
        { headers: { 'Cache-Control': 'no-store' } },
      )
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
