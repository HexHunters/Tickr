import { z } from 'zod'

export const accessEventSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string(),
  status: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  authorizationSource: z.enum(['OWNER', 'ADMIN', 'ASSIGNMENT']),
  assignmentId: z.string().nullable(),
})
export const staffAssignmentSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
  email: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  isAccountAvailable: z.boolean(),
  assignedAt: z.string(),
  revokedAt: z.string().nullable(),
})
export const entranceStatsSchema = z.object({
  totalTickets: z.number().int().nonnegative(),
  checkedIn: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  checkInRate: z.number().min(0).max(100),
  byType: z.array(
    z.object({
      ticketTypeName: z.string(),
      total: z.number(),
      checkedIn: z.number(),
      rate: z.number(),
    }),
  ),
})
export const checkInSuccessSchema = z.object({
  isValid: z.literal(true),
  ticketId: z.string().uuid(),
  holderName: z.string(),
  ticketTypeName: z.string(),
  checkedInAt: z.iso.datetime(),
  failureReason: z.null(),
})
export const notificationSchema = z.object({
  id: z.string().uuid(),
  subject: z.string().nullable(),
  type: z.string(),
  channel: z.string(),
  status: z.enum(['PENDING', 'SENDING', 'SENT', 'DELIVERED', 'FAILED']),
  createdAt: z.string(),
  sentAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
})
export const notificationListSchema = z.object({
  data: z.array(notificationSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number().positive(),
})
export type StaffAssignment = z.infer<typeof staffAssignmentSchema>
