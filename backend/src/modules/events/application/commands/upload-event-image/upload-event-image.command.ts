// ============================================
// Upload Event Image Command
// ============================================

/**
 * Command to upload or update an event's image
 *
 * Business Rules:
 * - Event must exist
 * - User must be the event organizer
 * - File must be valid image type (JPEG, PNG, WebP)
 * - File must not exceed 5MB
 * - Old image is deleted if exists
 */
export class UploadEventImageCommand {
  constructor(
    /**
     * Event ID (UUID)
     */
    public readonly eventId: string,
    /**
     * User ID performing the upload (must be organizer)
     */
    public readonly userId: string,
    /**
     * Image file buffer
     */
    public readonly file: Buffer,
    /**
     * Original filename (for extension detection)
     */
    public readonly filename: string,
    /**
     * MIME type of the file
     */
    public readonly mimeType: string,
  ) {}
}

// ============================================
// Result Types
// ============================================

/**
 * Successful upload result
 */
export interface UploadEventImageResult {
  imageUrl: string;
  thumbnailUrl?: string;
}

/**
 * Possible error types
 */
export type UploadEventImageError =
  | { type: 'EVENT_NOT_FOUND'; message: string }
  | { type: 'NOT_ORGANIZER'; message: string }
  | { type: 'INVALID_FILE_TYPE'; message: string }
  | { type: 'FILE_TOO_LARGE'; message: string }
  | { type: 'UPLOAD_FAILED'; message: string }
  | { type: 'EVENT_NOT_MODIFIABLE'; message: string };
