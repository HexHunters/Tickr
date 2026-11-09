import { describe, expect, it } from 'vitest'

import {
  adminError,
  describeObligations,
  organizerObligations,
  freeTicketsChoice,
  freeTicketsOverride,
  parseCommissionPercent,
  summarizeOrders,
} from '@/lib/admin'
import { isProxyPath } from '@/lib/api/proxy-routes'
import { ApiError } from '@/lib/api/request'

describe('back-office helpers', () => {
  it('converts a typed percentage into the decimal rate the API stores', () => {
    expect(parseCommissionPercent('3')).toBe(0.03)
    expect(parseCommissionPercent('4,5')).toBe(0.045)
    expect(parseCommissionPercent('12.25')).toBe(0.1225)
    expect(parseCommissionPercent('0')).toBe(0)
    expect(parseCommissionPercent('  ')).toBeNull()
  })

  it('rejects commission rates the API would refuse', () => {
    expect(() => parseCommissionPercent('21')).toThrow(/20 %/)
    expect(() => parseCommissionPercent('-1')).toThrow()
    expect(() => parseCommissionPercent('3.125')).toThrow()
    expect(() => parseCommissionPercent('abc')).toThrow()
  })

  it('summarizes paid volume, commission and refunds from status totals', () => {
    const summary = summarizeOrders([
      {
        status: 'PAID',
        count: 4,
        totalAmount: 212.5,
        platformFeeAmount: 12.75,
      },
      { status: 'REFUNDED', count: 1, totalAmount: 53, platformFeeAmount: 3 },
      { status: 'PENDING', count: 2, totalAmount: 90, platformFeeAmount: 5 },
      { status: 'PROCESSING', count: 1, totalAmount: 45, platformFeeAmount: 2 },
    ])
    expect(summary).toEqual({
      paidCount: 4,
      grossVolume: 212.5,
      commission: 12.75,
      refundedCount: 1,
      refundedAmount: 53,
      pendingCount: 3,
      totalCount: 8,
    })
  })

  it('maps the free-ticket choice to the tri-state override and back', () => {
    for (const override of [null, true, false]) {
      expect(freeTicketsOverride(freeTicketsChoice(override))).toBe(override)
    }
    expect(freeTicketsChoice(null)).toBe('inherit')
  })

  it('reads obligation counts from a demotion refusal and describes them in French', () => {
    const refusal = new ApiError(
      409,
      'ORGANIZER_HAS_OPEN_OBLIGATIONS',
      'This account…',
      {
        code: 'ORGANIZER_HAS_OPEN_OBLIGATIONS',
        details: {
          obligations: { openEvents: 2, unsettledOrders: 1, pendingRefunds: 0 },
        },
      },
    )
    expect(organizerObligations(refusal)).toEqual({
      openEvents: 2,
      unsettledOrders: 1,
      pendingRefunds: 0,
    })
    expect(adminError(refusal)).toBe(
      'Ce compte a encore 2 événements ouverts et 1 commande non soldée. Clôturez ou soldez-les avant de retirer le rôle organisateur ; la suspension reste possible.',
    )
    expect(
      describeObligations({
        openEvents: 1,
        unsettledOrders: 3,
        pendingRefunds: 2,
      }),
    ).toBe(
      '1 événement ouvert, 3 commandes non soldées et 2 remboursements en cours',
    )
    expect(
      organizerObligations(new ApiError(409, 'LAST_ACTIVE_ADMIN', '')),
    ).toBeNull()
  })

  it('explains stale-admin, last-admin and state refusals in French', () => {
    expect(
      adminError(new ApiError(403, 'ACTOR_NOT_AUTHORIZED', 'Only…')),
    ).toMatch(/n’a plus les droits/)
    expect(adminError(new ApiError(403, 'ACCESS_DENIED', 'Only…'))).toMatch(
      /n’a plus les droits/,
    )
    expect(adminError(new ApiError(409, 'LAST_ACTIVE_ADMIN', ''))).toMatch(
      /au moins un administrateur actif/,
    )
    expect(
      adminError(
        new ApiError(
          400,
          '',
          'A refund is already in progress or completed for this order',
        ),
      ),
    ).toBe(
      'Un remboursement est déjà en cours ou effectué pour cette commande.',
    )
    expect(
      adminError(new ApiError(400, '', 'Event is already cancelled')),
    ).toBe('Cet événement est déjà annulé.')
    // Unknown English messages never leak into the French UI.
    expect(adminError(new ApiError(400, '', 'Some new backend rule'))).toBe(
      'Cette action n’est pas possible dans l’état actuel.',
    )
  })

  it('explains self-modification refusals', () => {
    expect(
      adminError(
        new ApiError(403, 'SELF_MODIFICATION', 'Administrators cannot…'),
      ),
    ).toMatch(/propre compte/)
  })

  it('lets the browser reach admin routes through the proxy, and nothing broader', () => {
    expect(isProxyPath('admin/users')).toBe(true)
    expect(isProxyPath('admin/users/stats')).toBe(true)
    expect(
      isProxyPath('admin/users/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed/role'),
    ).toBe(true)
    expect(isProxyPath('admin/events/abc/cancel')).toBe(true)
    expect(isProxyPath('admin/orders/abc/refund')).toBe(true)
    expect(isProxyPath('admin')).toBe(false)
    expect(isProxyPath('admin/settings')).toBe(false)
    expect(isProxyPath('admin/../auth/login')).toBe(false)
    expect(isProxyPath('users')).toBe(false)
    expect(isProxyPath('events/abc/commission')).toBe(true)
  })
})
