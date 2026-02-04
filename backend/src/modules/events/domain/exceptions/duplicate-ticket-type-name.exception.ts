import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when a ticket type name is duplicated within an event
 */
export class DuplicateTicketTypeNameException extends DomainException {
  constructor(ticketTypeName: string) {
    super(
      `A ticket type with name "${ticketTypeName}" already exists for this event`,
      'DUPLICATE_TICKET_TYPE_NAME',
    );
  }

  /**
   * Factory method
   */
  static withName(name: string): DuplicateTicketTypeNameException {
    return new DuplicateTicketTypeNameException(name);
  }
}
