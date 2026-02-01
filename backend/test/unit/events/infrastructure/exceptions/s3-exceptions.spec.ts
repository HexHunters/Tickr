/**
 * @file S3 Exceptions Unit Tests
 * @description Tests for S3-related infrastructure exceptions
 */

import { InvalidFileTypeException } from '@modules/events/infrastructure/exceptions/invalid-file-type.exception';
import { FileSizeExceededException } from '@modules/events/infrastructure/exceptions/file-size-exceeded.exception';
import { S3UploadFailedException } from '@modules/events/infrastructure/exceptions/s3-upload-failed.exception';
import { S3DeleteFailedException } from '@modules/events/infrastructure/exceptions/s3-delete-failed.exception';

describe('S3 Infrastructure Exceptions', () => {
  describe('InvalidFileTypeException', () => {
    it('should create exception with allowed types and received type', () => {
      const exception = new InvalidFileTypeException(
        ['image/jpeg', 'image/png'],
        'application/pdf',
      );

      expect(exception.code).toBe('INVALID_FILE_TYPE');
      expect(exception.allowedTypes).toEqual(['image/jpeg', 'image/png']);
      expect(exception.receivedType).toBe('application/pdf');
      expect(exception.message).toContain('application/pdf');
      expect(exception.message).toContain('image/jpeg');
    });

    it('should create image exception using factory method', () => {
      const exception = InvalidFileTypeException.forImage('video/mp4');

      expect(exception.allowedTypes).toContain('image/jpeg');
      expect(exception.allowedTypes).toContain('image/png');
      expect(exception.allowedTypes).toContain('image/webp');
      expect(exception.receivedType).toBe('video/mp4');
    });

    it('should have correct name', () => {
      const exception = new InvalidFileTypeException(['image/jpeg'], 'image/gif');

      expect(exception.name).toBe('InvalidFileTypeException');
    });
  });

  describe('FileSizeExceededException', () => {
    it('should create exception with max and actual sizes', () => {
      const maxSize = 5 * 1024 * 1024; // 5MB
      const actualSize = 10 * 1024 * 1024; // 10MB

      const exception = new FileSizeExceededException(maxSize, actualSize);

      expect(exception.code).toBe('FILE_SIZE_EXCEEDED');
      expect(exception.maxSizeBytes).toBe(maxSize);
      expect(exception.actualSizeBytes).toBe(actualSize);
      expect(exception.message).toContain('10.00MB');
      expect(exception.message).toContain('5.00MB');
    });

    it('should create exception using factory method for default limit', () => {
      const actualSize = 7 * 1024 * 1024; // 7MB

      const exception = FileSizeExceededException.forDefault(actualSize);

      expect(exception.maxSizeBytes).toBe(5 * 1024 * 1024);
      expect(exception.actualSizeBytes).toBe(actualSize);
    });

    it('should have correct name', () => {
      const exception = new FileSizeExceededException(1024, 2048);

      expect(exception.name).toBe('FileSizeExceededException');
    });
  });

  describe('S3UploadFailedException', () => {
    it('should create exception with bucket and key', () => {
      const exception = new S3UploadFailedException(
        'my-bucket',
        'path/to/file.jpg',
      );

      expect(exception.code).toBe('S3_UPLOAD_FAILED');
      expect(exception.bucket).toBe('my-bucket');
      expect(exception.key).toBe('path/to/file.jpg');
      expect(exception.originalError).toBeUndefined();
      expect(exception.message).toContain('my-bucket');
      expect(exception.message).toContain('path/to/file.jpg');
    });

    it('should include original error when provided', () => {
      const originalError = new Error('Network timeout');
      const exception = new S3UploadFailedException(
        'my-bucket',
        'path/to/file.jpg',
        originalError,
      );

      expect(exception.originalError).toBe(originalError);
      expect(exception.message).toContain('Network timeout');
    });

    it('should have correct name', () => {
      const exception = new S3UploadFailedException('bucket', 'key');

      expect(exception.name).toBe('S3UploadFailedException');
    });
  });

  describe('S3DeleteFailedException', () => {
    it('should create exception with bucket and key', () => {
      const exception = new S3DeleteFailedException(
        'my-bucket',
        'path/to/file.jpg',
      );

      expect(exception.code).toBe('S3_DELETE_FAILED');
      expect(exception.bucket).toBe('my-bucket');
      expect(exception.key).toBe('path/to/file.jpg');
      expect(exception.originalError).toBeUndefined();
      expect(exception.message).toContain('my-bucket');
      expect(exception.message).toContain('path/to/file.jpg');
    });

    it('should include original error when provided', () => {
      const originalError = new Error('Access denied');
      const exception = new S3DeleteFailedException(
        'my-bucket',
        'path/to/file.jpg',
        originalError,
      );

      expect(exception.originalError).toBe(originalError);
      expect(exception.message).toContain('Access denied');
    });

    it('should have correct name', () => {
      const exception = new S3DeleteFailedException('bucket', 'key');

      expect(exception.name).toBe('S3DeleteFailedException');
    });
  });
});
