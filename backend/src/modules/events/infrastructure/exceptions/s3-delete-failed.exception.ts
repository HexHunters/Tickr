/**
 * S3 Delete Failed Exception
 *
 * Thrown when an S3 delete operation fails.
 */
export class S3DeleteFailedException extends Error {
  public readonly code = 'S3_DELETE_FAILED';
  public readonly bucket: string;
  public readonly key: string;
  public readonly originalError?: Error;

  constructor(bucket: string, key: string, originalError?: Error) {
    super(
      `Failed to delete file from S3 bucket '${bucket}' with key '${key}'${originalError ? `: ${originalError.message}` : ''}`,
    );
    this.name = 'S3DeleteFailedException';
    this.bucket = bucket;
    this.key = key;
    this.originalError = originalError;
  }
}
