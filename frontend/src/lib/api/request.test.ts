import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { ApiError, parseResponse } from '@/lib/api/request'
import { formatEventTime, formatMoney, safeReturnPath } from '@/lib/format'
import { canDisplayEntryCode } from '@/lib/ticket-access'

describe('API and admission boundaries', () => {
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
