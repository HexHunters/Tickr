/**
 * File Size Exceeded Exception
 *
 * Thrown when an uploaded file exceeds the maximum allowed size.
 */
export class FileSizeExceededException extends Error {
  public readonly code = 'FILE_SIZE_EXCEEDED';
  public readonly maxSizeBytes: number;
  public readonly actualSizeBytes: number;

  constructor(maxSizeBytes: number, actualSizeBytes: number) {
    const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(2);
    const actualSizeMB = (actualSizeBytes / (1024 * 1024)).toFixed(2);
    super(
      `File size ${actualSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB`,
    );
    this.name = 'FileSizeExceededException';
    this.maxSizeBytes = maxSizeBytes;
    this.actualSizeBytes = actualSizeBytes;
  }

  /**
   * Factory for default 5MB limit
   */
  static forDefault(actualSizeBytes: number): FileSizeExceededException {
    return new FileSizeExceededException(5 * 1024 * 1024, actualSizeBytes);
  }
}
