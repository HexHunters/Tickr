import { Injectable, Inject, Logger } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { EventStatus } from '../../../domain/value-objects/event-status.vo';
import { S3StorageService, ALLOWED_IMAGE_TYPES } from '../../../infrastructure/services/s3-storage.service';
import { InvalidFileTypeException } from '../../../infrastructure/exceptions/invalid-file-type.exception';
import { FileSizeExceededException } from '../../../infrastructure/exceptions/file-size-exceeded.exception';
import { S3UploadFailedException } from '../../../infrastructure/exceptions/s3-upload-failed.exception';
import { EVENT_REPOSITORY } from '../../ports/event.repository.port';

import type { EventRepositoryPort } from '../../ports/event.repository.port';
import type {
  UploadEventImageResultCommand,
  UploadEventImageError,
} from './upload-event-image.command';
import { UploadEventImageCommand } from './upload-event-image.command';

// Re-export types
export type { UploadEventImageResultCommand, UploadEventImageError };

// ============================================
// Handler
// ============================================

/**
 * Handler for UploadEventImageCommand
 *
 * Responsibilities:
 * 1. Validate event exists
 * 2. Validate user is the organizer
 * 3. Validate event can be modified
 * 4. Delete old image if exists
 * 5. Upload new image via S3 service
 * 6. Update event with new image URL
 * 7. Save updated event
 */
@Injectable()
export class UploadEventImageHandler {
  private readonly logger = new Logger(UploadEventImageHandler.name);

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    private readonly s3StorageService: S3StorageService,
  ) {}

  /**
   * Execute the upload event image command
   */
  async execute(
    command: UploadEventImageCommand,
  ): Promise<Result<UploadEventImageResultCommand, UploadEventImageError>> {
    this.logger.debug(
      `Uploading image for event ${command.eventId} by user ${command.userId}`,
    );

    // ============================================
    // 1. Validate event exists
    // ============================================
    const event = await this.eventRepository.findById(command.eventId);

    if (!event) {
      return Result.fail({
        type: 'EVENT_NOT_FOUND',
        message: `Event with id '${command.eventId}' not found`,
      });
    }

    // ============================================
    // 2. Validate user is the organizer
    // ============================================
    if (event.organizerId !== command.userId) {
      return Result.fail({
        type: 'NOT_ORGANIZER',
        message: `User '${command.userId}' is not the organizer of event '${command.eventId}'`,
      });
    }

    // ============================================
    // 3. Validate event can be modified
    // ============================================
    const status = event.status;
    if (status === EventStatus.CANCELLED) {
      return Result.fail({
        type: 'EVENT_NOT_MODIFIABLE',
        message: 'Cannot upload image for a cancelled event',
      });
    }
    if (status === EventStatus.COMPLETED) {
      return Result.fail({
        type: 'EVENT_NOT_MODIFIABLE',
        message: 'Cannot upload image for a completed event',
      });
    }

    // ============================================
    // 4. Delete old image if exists
    // ============================================
    const oldImageUrl = event.imageUrl;
    if (oldImageUrl) {
      try {
        await this.s3StorageService.deleteImage(oldImageUrl);
        this.logger.debug(`Deleted old image: ${oldImageUrl}`);
      } catch (error) {
        // Log but don't fail - old image cleanup is best effort
        this.logger.warn(
          `Failed to delete old image ${oldImageUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // ============================================
    // 5. Upload new image via S3 service
    // ============================================
    try {
      const uploadResult = await this.s3StorageService.uploadImage(
        command.file,
        command.eventId,
        command.filename,
        command.mimeType,
      );

      // ============================================
      // 6. Update event with new image URL
      // ============================================
      event.updateImage(uploadResult.originalUrl);

      // ============================================
      // 7. Save updated event
      // ============================================
      await this.eventRepository.save(event);

      this.logger.log(
        `Successfully uploaded image for event ${command.eventId}: ${uploadResult.originalUrl}`,
      );

      return Result.ok({
        imageUrl: uploadResult.originalUrl,
        thumbnailUrl: uploadResult.thumbnailUrl,
      });
    } catch (error) {
      // Handle specific S3 exceptions
      if (error instanceof InvalidFileTypeException) {
        return Result.fail({
          type: 'INVALID_FILE_TYPE',
          message: error.message,
        });
      }

      if (error instanceof FileSizeExceededException) {
        return Result.fail({
          type: 'FILE_TOO_LARGE',
          message: error.message,
        });
      }

      if (error instanceof S3UploadFailedException) {
        return Result.fail({
          type: 'UPLOAD_FAILED',
          message: error.message,
        });
      }

      // Unknown error
      this.logger.error(
        `Upload failed for event ${command.eventId}:`,
        error instanceof Error ? error.stack : error,
      );

      return Result.fail({
        type: 'UPLOAD_FAILED',
        message: error instanceof Error ? error.message : 'Unknown upload error',
      });
    }
  }
}
