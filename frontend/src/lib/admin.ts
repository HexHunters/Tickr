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

export function adminError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'SELF_MODIFICATION')
      return 'Vous ne pouvez pas modifier votre propre compte depuis l’administration.'
    if (error.code === 'PAYMENT_METHOD_DISABLED')
      return 'Ce moyen de paiement est désactivé : le remboursement doit être traité depuis la passerelle.'
    if (error.status === 403)
      return 'Cette action est réservée aux administrateurs.'
    if (error.status === 400 || error.status === 422)
      return (
        error.message || 'Cette action n’est pas possible dans l’état actuel.'
      )
  }
  return friendlyError(error)
}
