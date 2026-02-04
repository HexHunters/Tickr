/**
 * S3 Upload Failed Exception
 *
 * Thrown when an S3 upload operation fails.
 */
export class S3UploadFailedException extends Error {
  public readonly code = 'S3_UPLOAD_FAILED';
  public readonly bucket: string;
  public readonly key: string;
  public readonly originalError?: Error;

  constructor(bucket: string, key: string, originalError?: Error) {
    super(
      `Failed to upload file to S3 bucket '${bucket}' with key '${key}'${originalError ? `: ${originalError.message}` : ''}`,
    );
    this.name = 'S3UploadFailedException';
    this.bucket = bucket;
    this.key = key;
    this.originalError = originalError;
  }
}
