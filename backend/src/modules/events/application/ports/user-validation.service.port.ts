// ============================================
// User Validation Service Port
// ============================================

/**
 * Result of user validation
 * 
 * Note: Named with 'Interface' suffix to comply with architecture naming conventions
 * for interfaces in port files.
 */
export interface UserValidationResultInterface {
  /** Whether the user exists */
  exists: boolean;
  /** Whether the user has the ORGANIZER role */
  isOrganizer: boolean;
  /** Whether the user is active */
  isActive: boolean;
  /** The user's role (if exists) - uses string literal union type */
  role?: 'ADMIN' | 'ORGANIZER' | 'PARTICIPANT';
}

/** @deprecated Use UserValidationResultInterface instead */
export type UserValidationResult = UserValidationResultInterface;

/**
 * User Validation Service Port
 *
 * Anti-corruption layer for validating users from the Events bounded context.
 * This service provides a clean interface to the Users module without
 * coupling the Events module directly to Users domain.
 *
 * Design Decisions:
 * - Follows hexagonal architecture (port in application layer)
 * - Implementation in infrastructure layer calls Users module
 * - Caches results to reduce cross-module calls
 * - Uses local type definitions to avoid cross-module imports
 */
export interface UserValidationServicePort {
  /**
   * Validate that a user exists and has ORGANIZER role
   *
   * Used for event creation and modification.
   *
   * @param userId - The user's UUID
   */
  validateOrganizer(userId: string): Promise<UserValidationResult>;

  /**
   * Check if a user exists
   *
   * @param userId - The user's UUID
   */
  userExists(userId: string): Promise<boolean>;

  /**
   * Check if a user has a specific role
   *
   * @param userId - The user's UUID
   * @param role - The role to check
   */
  hasRole(userId: string, role: 'ADMIN' | 'ORGANIZER' | 'PARTICIPANT'): Promise<boolean>;

  /**
   * Validate user is the owner of an event
   *
   * @param userId - The user's UUID
   * @param organizerId - The event's organizer ID
   */
  isEventOwner(userId: string, organizerId: string): boolean;
}

// ============================================
// Injection Token
// ============================================

/**
 * Injection token for UserValidationService
 * Use with @Inject(USER_VALIDATION_SERVICE)
 */
export const USER_VALIDATION_SERVICE = Symbol('UserValidationServicePort');
