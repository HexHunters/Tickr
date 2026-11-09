import { z } from 'zod'

import { ApiError, friendlyError } from '@/lib/api/request'
import { formatMoney } from '@/lib/format'

import type { OrderStats, UserRole } from '@/lib/api/admin-contracts'

export const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  ORGANIZER: 'Organisateur',
  PARTICIPANT: 'Participant',
}

export const orderStatusLabels: Record<string, string> = {
  PENDING: 'En attente',
  PROCESSING: 'En cours',
  PAID: 'Payée',
  FAILED: 'Échouée',
  CANCELLED: 'Annulée',
  REFUNDED: 'Remboursée',
}

export const freeTicketsLabels = {
  inherit: 'Politique globale',
  allow: 'Autorisés',
  block: 'Bloqués',
} as const

export type FreeTicketsChoice = keyof typeof freeTicketsLabels

export function freeTicketsChoice(override: boolean | null): FreeTicketsChoice {
  return override === null ? 'inherit' : override ? 'allow' : 'block'
}

export function freeTicketsOverride(choice: FreeTicketsChoice): boolean | null {
  return choice === 'inherit' ? null : choice === 'allow'
}

export const paymentMethodLabels: Record<string, string> = {
  STRIPE: 'Carte (Stripe)',
  KONNECT: 'Konnect',
  PAYMEE: 'Paymee',
}

// Backend amounts are in dinars with three decimals; formatMoney expects millimes.
export function formatDinars(amount: number, currency = 'TND'): string {
  return formatMoney(Math.round(amount * 1000), currency)
}

export function formatRate(rate: number): string {
  return `${new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 2 }).format(rate * 100)} %`
}

// Commission is typed as a percentage in the back office and stored as a decimal.
export function parseCommissionPercent(value: string): number | null {
  const trimmed = value.trim().replace(',', '.')
  if (!trimmed) return null
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed))
    throw new Error(
      'Indiquez un taux entre 0 et 20 %, avec deux décimales au plus.',
    )
  const percent = Number(trimmed)
  if (percent > 20) throw new Error('Le taux ne peut pas dépasser 20 %.')
  return Math.round(percent * 100) / 10000
}

export function summarizeOrders(stats: OrderStats) {
  const byStatus = (status: string) =>
    stats.find((entry) => entry.status === status) ?? {
      count: 0,
      totalAmount: 0,
      platformFeeAmount: 0,
    }
  const paid = byStatus('PAID')
  const refunded = byStatus('REFUNDED')
  return {
    paidCount: paid.count,
    grossVolume: paid.totalAmount,
    commission: paid.platformFeeAmount,
    refundedCount: refunded.count,
    refundedAmount: refunded.totalAmount,
    pendingCount: byStatus('PENDING').count + byStatus('PROCESSING').count,
    totalCount: stats.reduce((sum, entry) => sum + entry.count, 0),
  }
}

export interface OrganizerObligations {
  openEvents: number
  unsettledOrders: number
  pendingRefunds: number
}

const obligationsBodySchema = z.object({
  details: z.object({
    obligations: z.object({
      openEvents: z.number(),
      unsettledOrders: z.number(),
      pendingRefunds: z.number(),
    }),
  }),
})

/** Obligation counts from a 409 ORGANIZER_HAS_OPEN_OBLIGATIONS response. */
export function organizerObligations(
  error: unknown,
): OrganizerObligations | null {
  if (
    !(error instanceof ApiError) ||
    error.code !== 'ORGANIZER_HAS_OPEN_OBLIGATIONS'
  )
    return null
  const parsed = obligationsBodySchema.safeParse(error.body)
  return parsed.success ? parsed.data.details.obligations : null
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`
}

export function describeObligations(obligations: OrganizerObligations): string {
  const parts = [
    obligations.openEvents &&
      plural(obligations.openEvents, 'événement ouvert', 'événements ouverts'),
    obligations.unsettledOrders &&
      plural(
        obligations.unsettledOrders,
        'commande non soldée',
        'commandes non soldées',
      ),
    obligations.pendingRefunds &&
      plural(
        obligations.pendingRefunds,
        'remboursement en cours',
        'remboursements en cours',
      ),
  ].filter((part): part is string => Boolean(part))
  return parts.length > 1
    ? `${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}`
    : (parts[0] ?? '')
}

// Backend messages are English; known refusals are shown in French.
const stateRefusals: Array<[RegExp, string]> = [
  [
    /already in progress or completed/i,
    'Un remboursement est déjà en cours ou effectué pour cette commande.',
  ],
  [
    /declined by the payment gateway/i,
    'La passerelle a refusé le remboursement.',
  ],
  [
    /manual processing/i,
    'Ce remboursement doit être traité depuis le tableau de bord de la passerelle.',
  ],
  [
    /cannot be refunded|PAID to REFUNDED/i,
    'Cette commande ne peut pas être remboursée dans son état actuel.',
  ],
  [/already cancelled/i, 'Cet événement est déjà annulé.'],
  [
    /already completed/i,
    'Cet événement est terminé : il ne peut plus être annulé.',
  ],
  [
    /after it has started/i,
    'L’événement a commencé : il ne peut plus être annulé.',
  ],
]

export function adminError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'SELF_MODIFICATION':
        return 'Vous ne pouvez pas modifier votre propre compte depuis l’administration.'
      case 'ACTOR_NOT_AUTHORIZED':
      case 'ACCESS_DENIED':
        return 'Votre compte n’a plus les droits d’administration. Reconnectez-vous ou contactez un autre administrateur.'
      case 'LAST_ACTIVE_ADMIN':
        return 'La plateforme doit garder au moins un administrateur actif.'
      case 'ORGANIZER_HAS_OPEN_OBLIGATIONS': {
        const obligations = organizerObligations(error)
        return `Ce compte a encore ${obligations ? describeObligations(obligations) : 'des événements ou des paiements en cours'}. Clôturez ou soldez-les avant de retirer le rôle organisateur ; la suspension reste possible.`
      }
      case 'PAYMENT_METHOD_DISABLED':
        return 'Ce moyen de paiement est désactivé : le remboursement doit être traité depuis la passerelle.'
    }
    if (error.status === 403)
      return 'Cette action est réservée aux administrateurs.'
    if (error.status === 400 || error.status === 409 || error.status === 422)
      return (
        stateRefusals.find(([pattern]) => pattern.test(error.message))?.[1] ??
        'Cette action n’est pas possible dans l’état actuel.'
      )
  }
  return friendlyError(error)
}
