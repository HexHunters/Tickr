import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { backendUrl } from '@/lib/api/server'
import {
  isSameOrigin,
  refreshSession,
  sessionToken,
} from '@/lib/api/session-server'

import type { NextRequest } from 'next/server'

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params
  const path = segments.join('/')
  const allowed =
    /^(events(?:\/[\w-]+)*|config\/public|notifications\/preferences\/me|users\/me(?:\/password)?|orders(?:\/[\w-]+)*|tickets(?:\/[\w-]+)*)$/.test(
      path,
    )
  if (!allowed)
    return NextResponse.json(
      { message: 'Route indisponible.' },
      { status: 404 },
    )
  if (request.method !== 'GET' && !isSameOrigin(request))
    return NextResponse.json({ message: 'Origine refusée.' }, { status: 403 })
  try {
    let token = await sessionToken()
    const body = request.method === 'GET' ? undefined : await request.text()
    const send = () =>
      fetch(backendUrl(path) + request.nextUrl.search, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body,
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      })
    let response = await send()
    if (response.status === 401) {
      token = await refreshSession()
      if (token) response = await send()
      else {
        const jar = await cookies()
        jar.delete('tickr_access')
        jar.delete('tickr_refresh')
      }
    }
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json(
      { message: 'Le service est momentanément indisponible.' },
      { status: 503 },
    )
  }
}
export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH }
