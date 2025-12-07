import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when the maximum number of ticket types is reached
 */
export class MaxTicketTypesReachedException extends DomainException {
  constructor(maxLimit: number) {
    super(
      `Maximum number of ticket types (${maxLimit}) has been reached. Cannot add more ticket types.`,
      'MAX_TICKET_TYPES_REACHED',
    );
  }

  /**
   * Get the standard exception with default limit
   */
  static withLimit(limit: number): MaxTicketTypesReachedException {
    return new MaxTicketTypesReachedException(limit);
  }
}
