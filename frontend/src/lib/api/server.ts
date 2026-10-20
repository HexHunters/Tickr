import 'server-only'

import { z } from 'zod'

import { ApiError, parseResponse } from '@/lib/api/request'

export function backendUrl(path: string): string {
  const base = (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3000'
  )
    .replace(/\/$/, '')
    .replace(/\/api$/, '')
  return `${base}/api/${path}`
}

export async function serverApi<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(backendUrl(path), {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    throw new ApiError(
      503,
      'UNAVAILABLE',
      'Le service est momentanément indisponible.',
    )
  }
  return parseResponse(response, schema)
}
