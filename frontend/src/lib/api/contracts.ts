import { z } from 'zod'

export const categoryLabels: Record<string, string> = {
  CONCERT: 'Concert',
  CONFERENCE: 'Conférence',
  SPORT: 'Sport',
  THEATER: 'Théâtre',
  WORKSHOP: 'Atelier',
  FESTIVAL: 'Festival',
  EXHIBITION: 'Exposition',
  NETWORKING: 'Rencontres',
  COMEDY: 'Comédie',
  OTHER: 'Autre',
}

const locationSchema = z.object({
  city: z.string(),
  country: z.string(),
  address: z.string().nullish(),
})
const eventBase = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  category: z.string(),
  location: locationSchema,
  startDate: z.string(),
  endDate: z.string(),
  imageUrl: z.string().nullish(),
  status: z.string(),
  isSoldOut: z.boolean(),
  isOnSale: z.boolean(),
})
export const eventListSchema = eventBase.extend({
  ticketSummary: z.object({ minPrice: z.number(), currency: z.string() }),
})
export const tierSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  priceAmount: z.number(),
  priceCurrency: z.string(),
  availableQuantity: z.number(),
  isSoldOut: z.boolean(),
  isOnSale: z.boolean(),
  isActive: z.boolean(),
})
export const eventDetailSchema = eventBase.extend({
  organizer: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    displayName: z.string().optional(),
  }),
  ticketTypes: z.array(tierSchema),
})
export const managedEventSchema = eventDetailSchema.extend({
  hasStarted: z.boolean(),
  totalCapacity: z.number(),
  soldTickets: z.number(),
  availableCapacity: z.number(),
  updatedAt: z.string(),
})
export const preferencesSchema = z.object({
  userId: z.string(),
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  marketingEnabled: z.boolean(),
  eventRemindersEnabled: z.boolean(),
})
export const publicConfigSchema = z.object({
  availablePaymentMethods: z.array(z.string()),
  effectiveCommissionRate: z.number(),
  currency: z.string(),
  reservationTtlMinutes: z.number(),
})
export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.string(),
  phone: z.string().nullish(),
})
export const authSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  user: userSchema,
})
export const orderSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  status: z.enum([
    'PENDING',
    'PROCESSING',
    'PAID',
    'FAILED',
    'CANCELLED',
    'REFUNDED',
  ]),
  items: z.array(
    z.object({
      id: z.string(),
      ticketTypeId: z.string(),
      ticketTypeName: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      lineTotal: z.number(),
    }),
  ),
  subtotal: z.number(),
  platformFee: z.number(),
  paymentFees: z.number(),
  total: z.number(),
  currency: z.string(),
  expiresAt: z.string(),
  paidAt: z.string().nullable(),
  createdAt: z.string(),
})
export const ticketSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  ticketTypeId: z.string(),
  status: z.enum([
    'RESERVED',
    'CONFIRMED',
    'CANCELLED',
    'CHECKED_IN',
    'EXPIRED',
  ]),
  priceAmount: z.number(),
  priceCurrency: z.string(),
  holderName: z.string(),
  holderEmail: z.string(),
  checkedInAt: z.string().nullable(),
  reservedUntil: z.string().nullable(),
  pdfUrl: z.string().nullable(),
  createdAt: z.string(),
})
export const ticketDetailSchema = ticketSchema.extend({
  orderId: z.string().nullable(),
  qrCode: z.string(),
})
export function paginated<T extends z.ZodType>(item: T) {
  return z.object({
    data: z.array(item),
    total: z.number(),
    page: z.number(),
    totalPages: z.number(),
  })
}

export type EventList = z.infer<typeof eventListSchema>
export type EventDetail = z.infer<typeof eventDetailSchema>
export type ManagedEvent = z.infer<typeof managedEventSchema>
export type NotificationPreferences = z.infer<typeof preferencesSchema>
export type TicketTier = z.infer<typeof tierSchema>
export type PublicConfig = z.infer<typeof publicConfigSchema>
export type User = z.infer<typeof userSchema>
export type Order = z.infer<typeof orderSchema>
export type Ticket = z.infer<typeof ticketSchema>
export type TicketDetail = z.infer<typeof ticketDetailSchema>

export interface EventView {
  id: string
  title: string
  category: string
  categoryCode: string
  city: string
  venue: string
  startsAt: string
  endsAt: string
  priceMillimes: number
  currency: string
  image: string
  description: string
  isSoldOut: boolean
  isOnSale: boolean
}

export function toEventView(event: EventList | EventDetail): EventView {
  const minimum =
    'ticketSummary' in event
      ? event.ticketSummary.minPrice
      : Math.min(...event.ticketTypes.map((tier) => tier.priceAmount))
  const currency =
    'ticketSummary' in event
      ? event.ticketSummary.currency
      : (event.ticketTypes[0]?.priceCurrency ?? 'TND')
  return {
    id: event.id,
    title: event.title,
    category: categoryLabels[event.category] ?? event.category,
    categoryCode: event.category,
    city: event.location.city,
    venue: event.location.address ?? event.location.city,
    startsAt: event.startDate,
    endsAt: event.endDate,
    priceMillimes: Number.isFinite(minimum) ? Math.round(minimum * 1000) : 0,
    currency,
    image: event.imageUrl ?? '',
    description: event.description ?? '',
    isSoldOut: event.isSoldOut,
    isOnSale: event.isOnSale,
  }
}
