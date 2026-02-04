/**
 * UUID Utilities for Domain Layer
 *
 * Provides UUID validation without external dependencies.
 * Used for validating entity identifiers in the domain layer.
 */

/**
 * UUID v4 regex pattern
 * Matches standard UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where y is 8, 9, a, or b
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * General UUID regex pattern
 * Matches any UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID (any version)
 *
 * @param value - The string to validate
 * @returns true if the value is a valid UUID
 *
 * @example
 * isUUID('550e8400-e29b-41d4-a716-446655440000') // true
 * isUUID('invalid') // false
 */
export function isUUID(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return UUID_REGEX.test(value);
}

/**
 * Check if a string is a valid UUID v4
 *
 * @param value - The string to validate
 * @returns true if the value is a valid UUID v4
 *
 * @example
 * isUUIDv4('550e8400-e29b-41d4-a716-446655440000') // true
 * isUUIDv4('550e8400-e29b-11d4-a716-446655440000') // false (v1)
 */
export function isUUIDv4(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return UUID_V4_REGEX.test(value);
}

/**
 * Validate that a value is a valid UUID and throw if not
 *
 * @param value - The string to validate
 * @param fieldName - The name of the field for error messages
 * @throws Error if the value is not a valid UUID
 *
 * @example
 * assertUUID('550e8400-e29b-41d4-a716-446655440000', 'userId') // passes
 * assertUUID('invalid', 'userId') // throws
 */
export function assertUUID(value: string, fieldName: string): void {
  if (!isUUID(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
}
