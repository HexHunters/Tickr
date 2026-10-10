/**
 * PAYMENT_METHOD_DISABLED error contract.
 *
 * Shared by the command handlers (Result errors) and the infrastructure gates
 * (403 response bodies) so every disabled-payment response carries the same
 * code and wording. Clients localize by `code`, never by `message`.
 */
export const PAYMENT_METHOD_DISABLED = 'PAYMENT_METHOD_DISABLED';

/** No payment gateway is enabled for this deployment. */
export const PAYMENTS_DISABLED_MESSAGE = 'Online payments are currently disabled.';

/** Gateways are enabled, but not the requested (or the order's) method. */
export const PAYMENT_METHOD_DISABLED_MESSAGE = 'This payment method is disabled.';
