import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { checkInSuccessSchema } from '@/lib/api/entrance-contracts'
import { forwardApiResponse } from '@/lib/api/forward-response'
import { ApiError, parseResponse } from '@/lib/api/request'
import { checkInError } from '@/lib/entrance'

describe('entrance mutation boundaries', () => {
  it('forwards a successful revocation without constructing an illegal 204 body', async () => {
    const result = await forwardApiResponse(new Response(null, { status: 204 }))
    expect(result.status).toBe(204)
    expect(result.body).toBeNull()
    expect(result.headers.get('Cache-Control')).toBe('no-store')
    await expect(parseResponse(result, z.void())).resolves.toBeUndefined()
  })

  it('preserves upstream rejection status and JSON through the proxy', async () => {
    const result = await forwardApiResponse(
      new Response(JSON.stringify({ message: 'Check-in access denied' }), {
        status: 403,
      }),
    )
    await expect(
      parseResponse(result, checkInSuccessSchema),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('requires a real successful entry and timestamp before showing confirmation', async () => {
    const valid = {
      isValid: true,
      ticketId: '60000000-0000-4000-8000-000000000008',
      holderName: 'A person',
      ticketTypeName: 'Standard',
      checkedInAt: '2026-10-21T18:00:00.000Z',
      failureReason: null,
    }
    for (const invalid of [
      { ...valid, isValid: false },
      { ...valid, checkedInAt: null },
      { ...valid, checkedInAt: 'invalid' },
      { ...valid, failureReason: 'Denied' },
    ]) {
      await expect(
        parseResponse(
          new Response(JSON.stringify(invalid)),
          checkInSuccessSchema,
        ),
      ).rejects.toMatchObject({ status: 502 })
    }
    await expect(
      parseResponse(new Response(JSON.stringify(valid)), checkInSuccessSchema),
    ).resolves.toEqual(valid)
  })

  it('never describes an uncertain network or server outcome as a confirmed rejection', () => {
    for (const error of [
      new Error('Network failed'),
      new ApiError(503, '', 'Private details'),
    ]) {
      expect(checkInError(error)).toContain('Résultat non confirmé')
      expect(checkInError(error)).not.toContain('Private')
    }
    expect(
      checkInError(new ApiError(400, '', 'Ticket was already checked in')),
    ).toContain('déjà été utilisé')
    expect(
      checkInError(new ApiError(400, '', 'Check-in opens at 2026-11-01')),
    ).toContain('pas encore ouvert')
    expect(
      checkInError(new ApiError(403, '', 'Check-in access denied')),
    ).toContain('plus accès')
  })
})
