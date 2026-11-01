import { z } from 'zod'

export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(['ADMIN', 'ORGANIZER', 'PARTICIPANT']),
  phone: z.string().nullish(),
  isActive: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
})
export const userStatsSchema = z.object({
  total: z.number(),
  active: z.number(),
  inactive: z.number(),
  byRole: z.object({
    ADMIN: z.number(),
    ORGANIZER: z.number(),
    PARTICIPANT: z.number(),
  }),
})
export const adminEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  status: z.string(),
  city: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  organizer: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  }),
  totalCapacity: z.number(),
  soldTickets: z.number(),
  revenue: z.number(),
  currency: z.string(),
  commissionRateOverride: z.number().nullable(),
  freeTicketsEnabledOverride: z.boolean().nullable(),
  cancellationReason: z.string().nullable(),
  createdAt: z.string(),
  publishedAt: z.string().nullable(),
})
export const eventStatusCountsSchema = z.object({
  DRAFT: z.number(),
  PUBLISHED: z.number(),
  CANCELLED: z.number(),
  COMPLETED: z.number(),
})
export const eventCommissionSchema = z.object({
  eventId: z.string(),
  commissionRateOverride: z.number().nullable(),
  effectiveCommissionRate: z.number(),
  usesGlobalRate: z.boolean(),
})
export const freeTicketsPolicySchema = z.object({
  eventId: z.string(),
  freeTicketsEnabledOverride: z.boolean().nullable(),
  effectiveFreeTicketsEnabled: z.boolean(),
})
export const adminOrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  eventId: z.string(),
  eventTitle: z.string().nullable(),
  buyerName: z.string().nullable(),
  buyerEmail: z.string().nullable(),
  status: z.string(),
  ticketCount: z.number(),
  subtotal: z.number(),
  platformFee: z.number(),
  paymentFees: z.number(),
  total: z.number(),
  currency: z.string(),
  paymentMethod: z.string().nullable(),
  paidAt: z.string().nullable(),
  refundedAt: z.string().nullable(),
  refundReason: z.string().nullable(),
  createdAt: z.string(),
})
export const orderStatsSchema = z.array(
  z.object({
    status: z.string(),
    count: z.number(),
    totalAmount: z.number(),
    platformFeeAmount: z.number(),
  }),
)
export const refundResultSchema = z.object({
  refundId: z.string(),
  status: z.string(),
})

export type AdminUser = z.infer<typeof adminUserSchema>
export type UserRole = AdminUser['role']
export type UserStats = z.infer<typeof userStatsSchema>
export type AdminEvent = z.infer<typeof adminEventSchema>
export type EventStatusCounts = z.infer<typeof eventStatusCountsSchema>
export type AdminOrder = z.infer<typeof adminOrderSchema>
export type OrderStats = z.infer<typeof orderStatsSchema>
