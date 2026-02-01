import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';

import { InvalidFileTypeException } from '../exceptions/invalid-file-type.exception';
import { FileSizeExceededException } from '../exceptions/file-size-exceeded.exception';
import { S3UploadFailedException } from '../exceptions/s3-upload-failed.exception';
import { S3DeleteFailedException } from '../exceptions/s3-delete-failed.exception';

// ============================================
// Types
// ============================================

/**
 * Supported image MIME types
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/**
 * Image size presets for resizing
 */
export interface ImageSize {
  width: number;
  height: number;
  suffix: string;
}

/**
 * Predefined image sizes
 */
export const IMAGE_SIZES: Record<string, ImageSize> = {
  thumbnail: { width: 640, height: 360, suffix: 'thumb' },
  main: { width: 1920, height: 1080, suffix: 'main' },
  original: { width: 0, height: 0, suffix: 'original' }, // 0 means no resize
};

/**
 * Upload result containing URLs for different sizes
 */
export interface UploadResult {
  originalUrl: string;
  thumbnailUrl?: string;
  mainUrl?: string;
  key: string;
}

// ============================================
// S3 Storage Service
// ============================================

/**
 * S3 Storage Service
 *
 * Handles image upload, deletion, and URL generation for event images.
 * Supports both AWS S3 and LocalStack for local development.
 *
 * Features:
 * - File type validation (JPEG, PNG, WebP)
 * - File size validation (max 5MB)
 * - Image resizing with Sharp
 * - CloudFront URL generation
 * - Signed URL generation for private access
 *
 * Path Structure: {env}/{eventId}/{timestamp}-{filename}
 */
@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly cloudFrontUrl?: string;
  private readonly nodeEnv: string;

  // Configuration constants
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly DEFAULT_SIGNED_URL_EXPIRATION = 3600; // 1 hour
  private static readonly IMAGE_QUALITY = 80;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('aws.region', 'eu-west-1');
    const endpoint = this.configService.get<string>('aws.s3.endpoint');
    const forcePathStyle = this.configService.get<boolean>('aws.s3.forcePathStyle', false);
    const accessKeyId = this.configService.get<string>('aws.credentials.accessKeyId', 'test');
    const secretAccessKey = this.configService.get<string>('aws.credentials.secretAccessKey', 'test');

    this.bucket = this.configService.get<string>('aws.s3.bucket', 'tickr-event-images');
    this.cloudFrontUrl = this.configService.get<string>('aws.cloudFront.url');
    this.nodeEnv = this.configService.get<string>('app.nodeEnv', 'development');

    // Initialize S3 client
    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      ...(endpoint && { endpoint }),
      forcePathStyle,
    });

    this.logger.log(`S3 Storage Service initialized - Bucket: ${this.bucket}, Region: ${region}`);
  }

  // ============================================
  // Public Methods
  // ============================================

  /**
   * Upload an image to S3
   *
   * @param file - File buffer
   * @param eventId - Event UUID
   * @param filename - Original filename
   * @param mimeType - File MIME type
   * @param generateThumbnail - Whether to generate thumbnail (default: true)
   * @returns Upload result with URLs
   * @throws InvalidFileTypeException if file type not allowed
   * @throws FileSizeExceededException if file too large
   * @throws S3UploadFailedException if upload fails
   */
  async uploadImage(
    file: Buffer,
    eventId: string,
    filename: string,
    mimeType: string,
    generateThumbnail: boolean = true,
  ): Promise<UploadResult> {
    this.logger.debug(`Uploading image for event ${eventId}: ${filename}`);

    // Validate file
    this.validateFileType(mimeType);
    this.validateFileSize(file.length);

    // Generate unique key
    const timestamp = Date.now();
    const sanitizedFilename = this.sanitizeFilename(filename);
    const baseKey = `${this.nodeEnv}/${eventId}/${timestamp}-${sanitizedFilename}`;

    try {
      // Upload original image
      const originalKey = `${baseKey}`;
      await this.uploadToS3(file, originalKey, mimeType);

      const result: UploadResult = {
        originalUrl: this.getPublicUrl(originalKey),
        key: originalKey,
      };

      // Generate and upload resized versions
      if (generateThumbnail) {
        // Generate thumbnail
        const thumbnailBuffer = await this.resizeImage(
          file,
          IMAGE_SIZES.thumbnail.width,
          IMAGE_SIZES.thumbnail.height,
        );
        const thumbnailKey = `${baseKey}-${IMAGE_SIZES.thumbnail.suffix}`;
        await this.uploadToS3(thumbnailBuffer, thumbnailKey, mimeType);
        result.thumbnailUrl = this.getPublicUrl(thumbnailKey);

        // Generate main size
        const mainBuffer = await this.resizeImage(
          file,
          IMAGE_SIZES.main.width,
          IMAGE_SIZES.main.height,
        );
        const mainKey = `${baseKey}-${IMAGE_SIZES.main.suffix}`;
        await this.uploadToS3(mainBuffer, mainKey, mimeType);
        result.mainUrl = this.getPublicUrl(mainKey);
      }

      this.logger.log(`Successfully uploaded image for event ${eventId}: ${originalKey}`);
      return result;
    } catch (error) {
      if (
        error instanceof InvalidFileTypeException ||
        error instanceof FileSizeExceededException ||
        error instanceof S3UploadFailedException
      ) {
        throw error;
      }
      throw new S3UploadFailedException(this.bucket, baseKey, error as Error);
    }
  }

  /**
   * Delete an image from S3
   *
   * @param imageUrl - Public URL of the image
   * @throws S3DeleteFailedException if deletion fails (except NotFound)
   */
  async deleteImage(imageUrl: string): Promise<void> {
    const key = this.extractKeyFromUrl(imageUrl);
    if (!key) {
      this.logger.warn(`Could not extract S3 key from URL: ${imageUrl}`);
      return;
    }

    this.logger.debug(`Deleting image: ${key}`);

    try {
      await this.deleteFromS3(key);

      // Also delete resized versions if they exist
      await this.deleteFromS3(`${key}-${IMAGE_SIZES.thumbnail.suffix}`).catch(() => {});
      await this.deleteFromS3(`${key}-${IMAGE_SIZES.main.suffix}`).catch(() => {});

      this.logger.log(`Successfully deleted image: ${key}`);
    } catch (error) {
      // Ignore NotFound errors - the file might already be deleted
      if ((error as any)?.name === 'NoSuchKey' || (error as any)?.Code === 'NoSuchKey') {
        this.logger.debug(`Image already deleted or not found: ${key}`);
        return;
      }
      throw new S3DeleteFailedException(this.bucket, key, error as Error);
    }
  }

  /**
   * Generate a signed URL for private access
   *
   * @param imageUrl - Public URL of the image
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Signed URL
   */
  async generateSignedUrl(
    imageUrl: string,
    expiresIn: number = S3StorageService.DEFAULT_SIGNED_URL_EXPIRATION,
  ): Promise<string> {
    const key = this.extractKeyFromUrl(imageUrl);
    if (!key) {
      throw new Error(`Could not extract S3 key from URL: ${imageUrl}`);
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Check if an image exists in S3
   *
   * @param imageUrl - Public URL of the image
   * @returns True if exists, false otherwise
   */
  async imageExists(imageUrl: string): Promise<boolean> {
    const key = this.extractKeyFromUrl(imageUrl);
    if (!key) {
      return false;
    }

    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resize an image using Sharp
   *
   * @param buffer - Image buffer
   * @param width - Target width (0 = no resize)
   * @param height - Target height (0 = no resize)
   * @returns Resized image buffer
   */
  async resizeImage(buffer: Buffer, width: number, height: number): Promise<Buffer> {
    if (width === 0 || height === 0) {
      return buffer;
    }

    return sharp(buffer)
      .resize(width, height, {
        fit: 'inside', // Maintains aspect ratio
        withoutEnlargement: true, // Don't upscale small images
      })
      .jpeg({ quality: S3StorageService.IMAGE_QUALITY })
      .toBuffer();
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Validate file MIME type
   */
  private validateFileType(mimeType: string): void {
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType as AllowedImageType)) {
      throw InvalidFileTypeException.forImage(mimeType);
    }
  }

  /**
   * Validate file size
   */
  private validateFileSize(sizeBytes: number): void {
    if (sizeBytes > S3StorageService.MAX_FILE_SIZE) {
      throw FileSizeExceededException.forDefault(sizeBytes);
    }
  }

  /**
   * Sanitize filename for S3 key
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Upload buffer to S3
   */
  private async uploadToS3(buffer: Buffer, key: string, mimeType: string): Promise<void> {
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          CacheControl: 'max-age=31536000', // 1 year cache for immutable images
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to upload to S3: ${key}`, error);
      throw new S3UploadFailedException(this.bucket, key, error as Error);
    }
  }

  /**
   * Delete object from S3
   */
  private async deleteFromS3(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  /**
   * Get public URL for an S3 object
   * Uses CloudFront URL if configured, otherwise S3 URL
   */
  private getPublicUrl(key: string): string {
    if (this.cloudFrontUrl) {
      return `${this.cloudFrontUrl}/${key}`;
    }

    // Fallback to S3 URL (for development/testing)
    const endpoint = this.configService.get<string>('aws.s3.endpoint');
    if (endpoint) {
      // LocalStack format
      return `${endpoint}/${this.bucket}/${key}`;
    }

    // Standard S3 URL
    const region = this.configService.get<string>('aws.region', 'eu-west-1');
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  /**
   * Extract S3 key from a public URL
   */
  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);

      // CloudFront URL: https://xxx.cloudfront.net/{key}
      if (this.cloudFrontUrl && url.startsWith(this.cloudFrontUrl)) {
        return urlObj.pathname.substring(1); // Remove leading /
      }

      // S3 URL: https://{bucket}.s3.{region}.amazonaws.com/{key}
      if (url.includes('.s3.') && url.includes('.amazonaws.com')) {
        return urlObj.pathname.substring(1);
      }

      // LocalStack URL: http://localhost:4566/{bucket}/{key}
      if (url.includes('localhost') || url.includes('localstack')) {
        const pathParts = urlObj.pathname.split('/');
        // Remove empty string and bucket name
        return pathParts.slice(2).join('/');
      }

      return null;
    } catch {
      return null;
    }
  }
}
