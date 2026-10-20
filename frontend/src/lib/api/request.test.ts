import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import {
  ApiError,
  friendlyError,
  parseResponse,
  requestApi,
} from '@/lib/api/request'
import {
  formatEventDate,
  formatEventTime,
  formatMoney,
  readQuantity,
  readSearchValue,
  safeReturnPath,
} from '@/lib/format'
import { canDisplayEntryCode } from '@/lib/ticket-access'

afterEach(() => vi.unstubAllGlobals())

describe('API and admission boundaries', () => {
  it('returns validated API data without replacing or inventing fields', async () => {
    const response = new Response(
      JSON.stringify({ id: 'server-record', extra: 'ignored' }),
    )
    await expect(
      parseResponse(response, z.object({ id: z.string() })),
    ).resolves.toEqual({ id: 'server-record' })
    await expect(
      parseResponse(new Response('not json'), z.object({ id: z.string() })),
    ).rejects.toMatchObject({ status: 502 })
  })

  it('keeps requests on the cookie-authenticated same-origin proxy', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response('{"id":"server-record"}'))
    vi.stubGlobal('fetch', fetcher)
    await expect(
      requestApi('events', z.object({ id: z.string() })),
    ).resolves.toEqual({ id: 'server-record' })
    expect(fetcher).toHaveBeenCalledWith(
      '/api/backend/events',
      expect.objectContaining({
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  it('reports network failure as unavailable rather than an empty successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Network failed')),
    )
    await expect(
      requestApi('tickets', z.array(z.unknown())),
    ).rejects.toMatchObject({ status: 503, code: 'UNAVAILABLE' })
  })

  it('gives actionable errors without exposing backend failure details', () => {
    expect(friendlyError(new Error('Private internal details'))).not.toContain(
      'Private',
    )
    expect(
      friendlyError(new ApiError(500, 'DATABASE_ERROR', 'secret table name')),
    ).not.toContain('secret')
    expect(
      friendlyError(new ApiError(400, 'INVALID_INPUT', 'SQL details')),
    ).not.toContain('SQL')
    expect(friendlyError(new ApiError(401, '', ''))).toMatch(/session.*expiré/)
    expect(friendlyError(new ApiError(403, '', ''))).toMatch(/compte/)
    expect(friendlyError(new ApiError(404, '', ''))).toMatch(/disponibles/)
    expect(friendlyError(new ApiError(429, '', ''))).toMatch(/Patientez/)
    expect(
      friendlyError(new ApiError(409, 'CONFLICT', 'Événement complet')),
    ).toBe('Événement complet')
  })

  it('handles malformed error envelopes without losing the HTTP status', async () => {
    await expect(
      parseResponse(new Response('invalid', { status: 503 }), z.unknown()),
    ).rejects.toMatchObject({ status: 503, code: '' })
    await expect(
      parseResponse(
        new Response('{"message":["Invalid field"]}', { status: 400 }),
        z.unknown(),
      ),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('reads URL selections safely and displays dates in Tunis', () => {
    expect(readSearchValue(['CONCERT', 'THEATER'])).toBe('CONCERT')
    expect(readSearchValue()).toBe('')
    expect(readSearchValue('Tunis')).toBe('Tunis')
    expect(readQuantity('2')).toBe(2)
    for (const value of ['0', '-1', '7', '1.5', 'invalid'])
      expect(readQuantity(value)).toBe(1)
    expect(formatEventDate('2026-11-14T23:30:00Z', true)).toMatch(
      /15 novembre 2026/,
    )
    expect(formatMoney(20000, 'EUR')).toMatch(/20[,.]000 EUR/)
  })
  it('rejects incomplete successful responses instead of returning demo data', async () => {
    await expect(
      parseResponse(
        new Response(JSON.stringify({ title: 'Incomplete' })),
        z.object({ id: z.string() }),
      ),
    ).rejects.toMatchObject({ status: 502, code: 'INVALID_RESPONSE' })
  })
  it('preserves an unavailable method error from the server', async () => {
    await expect(
      parseResponse(
        new Response(
          JSON.stringify({
            code: 'PAYMENT_METHOD_DISABLED',
            message: 'Unavailable',
          }),
          { status: 403 },
        ),
        z.unknown(),
      ),
    ).rejects.toMatchObject({ status: 403, code: 'PAYMENT_METHOD_DISABLED' })
  })
  it('does not treat an authorization failure as an empty wallet', async () => {
    await expect(
      parseResponse(new Response('{}', { status: 401 }), z.array(z.unknown())),
    ).rejects.toBeInstanceOf(ApiError)
  })
  it('requires both a confirmed ticket and a paid order for a QR', () => {
    expect(canDisplayEntryCode('CONFIRMED', 'PAID')).toBe(true)
    for (const status of ['RESERVED', 'CHECKED_IN', 'CANCELLED', 'EXPIRED'])
      expect(canDisplayEntryCode(status, 'PAID')).toBe(false)
    for (const status of [
      undefined,
      'PENDING',
      'PROCESSING',
      'REFUNDED',
      'CANCELLED',
      'FAILED',
    ])
      expect(canDisplayEntryCode('CONFIRMED', status)).toBe(false)
  })
  it('keeps money precision and Tunis 24-hour times', () => {
    expect(formatMoney(45250)).toMatch(/45[,.]250\sDT/)
    expect(formatEventTime('2026-11-14T19:00:00Z')).toBe('20:00')
  })
  it('only accepts local navigation after sign-in', () => {
    expect(safeReturnPath('/orders/123')).toBe('/orders/123')
    for (const path of [
      'https://example.com',
      '//example.com',
      '/\\example.com',
      '/\n/example.com',
    ])
      expect(safeReturnPath(path)).toBe('/tickets')
  })
})
