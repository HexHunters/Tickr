/**
 * What an organizer still owes before losing the ability to run events.
 *
 * Read from the Events and Payments contexts through an infrastructure
 * adapter; the Users context never writes to them.
 */
export interface OrganizerObligationsInterface {
  /** Owned events still in DRAFT or PUBLISHED (ongoing included), sold or not */
  readonly openEvents: number;
  /** Payments in flight on owned events, or paid orders on cancelled events (refund owed) */
  readonly unsettledOrders: number;
  /** Refunds started on owned events and not yet completed or failed */
  readonly pendingRefunds: number;
}

export function hasOpenObligations(obligations: OrganizerObligationsInterface): boolean {
  return (
    obligations.openEvents > 0 ||
    obligations.unsettledOrders > 0 ||
    obligations.pendingRefunds > 0
  );
}

export interface OrganizerObligationsPort {
  findOpenObligations(organizerId: string): Promise<OrganizerObligationsInterface>;
}
