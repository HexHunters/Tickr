export const PAYMENT_ADMIN_ACCESS = Symbol('PAYMENT_ADMIN_ACCESS');

/**
 * Re-validates an administrator against the Users context at command time,
 * instead of trusting the JWT role, which outlives a demotion or suspension.
 */
export interface PaymentAdminAccessPort {
  isActiveAdmin(userId: string): Promise<boolean>;
}
