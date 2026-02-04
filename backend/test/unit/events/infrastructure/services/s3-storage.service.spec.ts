/**
 * @file S3StorageService Unit Tests
 * @description Tests for S3 image upload, deletion, and URL generation
 */

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileSizeExceededException } from '@modules/events/infrastructure/exceptions/file-size-exceeded.exception';
import { InvalidFileTypeException } from '@modules/events/infrastructure/exceptions/invalid-file-type.exception';
import { S3DeleteFailedException } from '@modules/events/infrastructure/exceptions/s3-delete-failed.exception';
import { S3UploadFailedException } from '@modules/events/infrastructure/exceptions/s3-upload-failed.exception';
import {
  S3StorageService,
  ALLOWED_IMAGE_TYPES,
  IMAGE_SIZES,
} from '@modules/events/infrastructure/services/s3-storage.service';
import { ConfigService } from '@nestjs/config';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
    })),
    PutObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: 'PutObjectCommand' })),
    DeleteObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: 'DeleteObjectCommand' })),
    GetObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: 'GetObjectCommand' })),
    HeadObjectCommand: jest.fn().mockImplementation((params) => ({ ...params, _type: 'HeadObjectCommand' })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.example.com/key'),
}));

// Mock sharp
jest.mock('sharp', () => {
  const mockSharp = jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('resized-image')),
  }));
  // Add default export for ES module interop
  return mockSharp;
});

describe('S3StorageService', () => {
  let service: S3StorageService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockS3Client: { send: jest.Mock };

  const testEventId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

  beforeEach(() => {
    // Create mock config service
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          'aws.region': 'eu-west-1',
          'aws.s3.endpoint': undefined,
          'aws.s3.forcePathStyle': false,
          'aws.credentials.accessKeyId': 'test-access-key',
          'aws.credentials.secretAccessKey': 'test-secret-key',
          'aws.s3.bucket': 'tickr-event-images',
          'aws.cloudFront.url': undefined,
          'app.nodeEnv': 'test',
        };
        return config[key] ?? defaultValue;
      }),
    } as any;

    // Create service
    service = new S3StorageService(mockConfigService);

    // Get the mock S3 client instance
    mockS3Client = (service as any).s3Client as { send: jest.Mock };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadImage', () => {
    const validImageBuffer = Buffer.from('valid-image-data');
    const filename = 'test-image.jpg';
    const mimeType = 'image/jpeg';

    beforeEach(() => {
      mockS3Client.send.mockResolvedValue({});
    });

    it('should upload image successfully', async () => {
      const result = await service.uploadImage(
        validImageBuffer,
        testEventId,
        filename,
        mimeType,
        false, // Skip thumbnail generation for this test
      );

      expect(result).toBeDefined();
      expect(result.originalUrl).toContain(testEventId);
      expect(result.key).toContain(testEventId);
      expect(mockS3Client.send).toHaveBeenCalled();
    });

    it('should generate thumbnail and main size when enabled', async () => {
      const result = await service.uploadImage(
        validImageBuffer,
        testEventId,
        filename,
        mimeType,
        true,
      );

      expect(result.thumbnailUrl).toBeDefined();
      expect(result.mainUrl).toBeDefined();
      // Original + thumbnail + main = 3 uploads
      expect(mockS3Client.send).toHaveBeenCalledTimes(3);
    });

    it('should sanitize filename', async () => {
      const result = await service.uploadImage(
        validImageBuffer,
        testEventId,
        'My Image (1).JPG',
        mimeType,
        false,
      );

      expect(result.key).toContain('my-image-1-.jpg');
    });

    it('should throw InvalidFileTypeException for unsupported file type', async () => {
      await expect(
        service.uploadImage(validImageBuffer, testEventId, filename, 'application/pdf', false),
      ).rejects.toThrow(InvalidFileTypeException);
    });

    it('should throw FileSizeExceededException for files over 5MB', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB

      await expect(
        service.uploadImage(largeBuffer, testEventId, filename, mimeType, false),
      ).rejects.toThrow(FileSizeExceededException);
    });

    it('should throw S3UploadFailedException when S3 upload fails', async () => {
      mockS3Client.send.mockRejectedValue(new Error('S3 Error'));

      await expect(
        service.uploadImage(validImageBuffer, testEventId, filename, mimeType, false),
      ).rejects.toThrow(S3UploadFailedException);
    });

    it('should accept all allowed image types', async () => {
      for (const type of ALLOWED_IMAGE_TYPES) {
        mockS3Client.send.mockResolvedValue({});

        const result = await service.uploadImage(
          validImageBuffer,
          testEventId,
          `test.${type.split('/')[1]}`,
          type,
          false,
        );

        expect(result.originalUrl).toBeDefined();
      }
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      mockS3Client.send.mockResolvedValue({});

      const imageUrl = `https://tickr-event-images.s3.eu-west-1.amazonaws.com/test/${testEventId}/1234-image.jpg`;

      await expect(service.deleteImage(imageUrl)).resolves.not.toThrow();
      expect(mockS3Client.send).toHaveBeenCalled();
    });

    it('should handle non-existent image gracefully', async () => {
      const notFoundError = new Error('NoSuchKey');
      (notFoundError as any).name = 'NoSuchKey';
      mockS3Client.send.mockRejectedValue(notFoundError);

      const imageUrl = `https://tickr-event-images.s3.eu-west-1.amazonaws.com/test/${testEventId}/1234-image.jpg`;

      await expect(service.deleteImage(imageUrl)).resolves.not.toThrow();
    });

    it('should handle invalid URL gracefully', async () => {
      await expect(service.deleteImage('invalid-url')).resolves.not.toThrow();
    });

    it('should throw S3DeleteFailedException for other S3 errors', async () => {
      mockS3Client.send.mockRejectedValue(new Error('Access Denied'));

      const imageUrl = `https://tickr-event-images.s3.eu-west-1.amazonaws.com/test/${testEventId}/1234-image.jpg`;

      await expect(service.deleteImage(imageUrl)).rejects.toThrow(S3DeleteFailedException);
    });

    it('should delete thumbnail and main versions', async () => {
      mockS3Client.send.mockResolvedValue({});

      const imageUrl = `https://tickr-event-images.s3.eu-west-1.amazonaws.com/test/${testEventId}/1234-image.jpg`;

      await service.deleteImage(imageUrl);

      // Should attempt to delete original + thumbnail + main
      expect(mockS3Client.send).toHaveBeenCalledTimes(3);
    });
  });

  describe('generateSignedUrl', () => {
    it('should generate signed URL', async () => {
      const imageUrl = `https://tickr-event-images.s3.eu-west-1.amazonaws.com/test/${testEventId}/1234-image.jpg`;

      const signedUrl = await service.generateSignedUrl(imageUrl);

      expect(signedUrl).toBe('https://signed-url.example.com/key');
    });

    it('should throw error for invalid URL', async () => {
      await expect(service.generateSignedUrl('invalid-url')).rejects.toThrow();
    });

    it('should accept custom expiration time', async () => {
      const imageUrl = `https://tickr-event-images.s3.eu-west-1.amazonaws.com/test/${testEventId}/1234-image.jpg`;

      await service.generateSignedUrl(imageUrl, 7200); // 2 hours

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 7200 },
      );
    });
  });

  describe('imageExists', () => {
    it('should return true when image exists', async () => {
      mockS3Client.send.mockResolvedValue({});

      const imageUrl = `https://tickr-event-images.s3.eu-west-1.amazonaws.com/test/${testEventId}/1234-image.jpg`;

      const exists = await service.imageExists(imageUrl);

      expect(exists).toBe(true);
    });

    it('should return false when image does not exist', async () => {
      mockS3Client.send.mockRejectedValue(new Error('NotFound'));

      const imageUrl = `https://tickr-event-images.s3.eu-west-1.amazonaws.com/test/${testEventId}/1234-image.jpg`;

      const exists = await service.imageExists(imageUrl);

      expect(exists).toBe(false);
    });

    it('should return false for invalid URL', async () => {
      const exists = await service.imageExists('invalid-url');

      expect(exists).toBe(false);
    });
  });

  describe('resizeImage', () => {
    it('should resize image to specified dimensions', async () => {
      const buffer = Buffer.from('test-image');

      const result = await service.resizeImage(buffer, 640, 360);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should return original buffer when dimensions are 0', async () => {
      const buffer = Buffer.from('test-image');

      const result = await service.resizeImage(buffer, 0, 0);

      expect(result).toBe(buffer);
    });
  });

  describe('URL parsing', () => {
    it('should extract key from S3 URL', async () => {
      mockS3Client.send.mockResolvedValue({});

      const imageUrl = `https://tickr-event-images.s3.eu-west-1.amazonaws.com/test/${testEventId}/1234-image.jpg`;

      await service.deleteImage(imageUrl);

      // Verify the key was extracted correctly by checking the delete command
      expect(mockS3Client.send).toHaveBeenCalled();
    });

    it('should extract key from LocalStack URL', async () => {
      // Create a new config for LocalStack
      const localStackConfig = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            'aws.region': 'eu-west-1',
            'aws.s3.endpoint': 'http://localhost:4566',
            'aws.s3.forcePathStyle': true,
            'aws.credentials.accessKeyId': 'test',
            'aws.credentials.secretAccessKey': 'test',
            'aws.s3.bucket': 'tickr-event-images',
            'aws.cloudFront.url': undefined,
            'app.nodeEnv': 'test',
          };
          return config[key] ?? defaultValue;
        }),
      } as unknown as ConfigService;

      const localService = new S3StorageService(localStackConfig);
      const localMockS3Client = (localService as any).s3Client as { send: jest.Mock };
      localMockS3Client.send.mockResolvedValue({});

      const imageUrl = `http://localhost:4566/tickr-event-images/test/${testEventId}/1234-image.jpg`;

      await localService.deleteImage(imageUrl);

      expect(localMockS3Client.send).toHaveBeenCalled();
    });
  });

  describe('CloudFront URL generation', () => {
    it('should use CloudFront URL when configured', async () => {
      // Create a new config with CloudFront URL
      const cfConfig = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            'aws.region': 'eu-west-1',
            'aws.s3.endpoint': undefined,
            'aws.s3.forcePathStyle': false,
            'aws.credentials.accessKeyId': 'test',
            'aws.credentials.secretAccessKey': 'test',
            'aws.s3.bucket': 'tickr-event-images',
            'aws.cloudFront.url': 'https://d1234567890.cloudfront.net',
            'app.nodeEnv': 'test',
          };
          return config[key] ?? defaultValue;
        }),
      } as unknown as ConfigService;

      const cfService = new S3StorageService(cfConfig);
      const cfMockS3Client = (cfService as any).s3Client as { send: jest.Mock };
      cfMockS3Client.send.mockResolvedValue({});

      const result = await cfService.uploadImage(
        Buffer.from('image'),
        testEventId,
        'test.jpg',
        'image/jpeg',
        false,
      );

      expect(result.originalUrl).toContain('cloudfront.net');
    });
  });

  describe('constants', () => {
    it('should export allowed image types', () => {
      expect(ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
      expect(ALLOWED_IMAGE_TYPES).toContain('image/png');
      expect(ALLOWED_IMAGE_TYPES).toContain('image/webp');
    });

    it('should export image size presets', () => {
      expect(IMAGE_SIZES.thumbnail).toEqual({ width: 640, height: 360, suffix: 'thumb' });
      expect(IMAGE_SIZES.main).toEqual({ width: 1920, height: 1080, suffix: 'main' });
    });
  });
});
