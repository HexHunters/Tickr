/**
 * Invalid File Type Exception
 *
 * Thrown when an uploaded file has an unsupported MIME type.
 */
export class InvalidFileTypeException extends Error {
  public readonly code = 'INVALID_FILE_TYPE';
  public readonly allowedTypes: string[];
  public readonly receivedType: string;

  constructor(allowedTypes: string[], receivedType: string) {
    super(
      `Invalid file type: ${receivedType}. Allowed types: ${allowedTypes.join(', ')}`,
    );
    this.name = 'InvalidFileTypeException';
    this.allowedTypes = allowedTypes;
    this.receivedType = receivedType;
  }

  /**
   * Factory for image validation
   */
  static forImage(receivedType: string): InvalidFileTypeException {
    return new InvalidFileTypeException(
      ['image/jpeg', 'image/png', 'image/webp'],
      receivedType,
    );
  }
}
