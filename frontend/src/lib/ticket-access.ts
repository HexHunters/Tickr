export function canDisplayEntryCode(
  ticketStatus: string,
  orderStatus?: string,
): boolean {
  return ticketStatus === 'CONFIRMED' && orderStatus === 'PAID'
}
