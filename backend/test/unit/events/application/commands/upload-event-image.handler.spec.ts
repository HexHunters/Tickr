

import { UploadEventImageCommand } from '@modules/events/application/commands/upload-event-image/upload-event-image.command';
import { UploadEventImageHandler } from '@modules/events/application/commands/upload-event-image/upload-event-image.handler';
import { EVENT_REPOSITORY } from '@modules/events/application/ports/event.repository.port';
import { EventEntity } from '@modules/events/domain/entities/event.entity';
import { EventCategory } from '@modules/events/domain/value-objects/event-category.vo';
import { EventDateRangeVO } from '@modules/events/domain/value-objects/event-date-range.vo';
import { EventStatus } from '@modules/events/domain/value-objects/event-status.vo';
import { LocationVO } from '@modules/events/domain/value-objects/location.vo';
import { FileSizeExceededException } from '@modules/events/infrastructure/exceptions/file-size-exceeded.exception';
import { InvalidFileTypeException } from '@modules/events/infrastructure/exceptions/invalid-file-type.exception';
import { S3UploadFailedException } from '@modules/events/infrastructure/exceptions/s3-upload-failed.exception';
import { S3StorageService } from '@modules/events/infrastructure/services/s3-storage.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('UploadEventImageHandler', () => {
  let handler: UploadEventImageHandler;
  let mockEventRepository: {
    findById: jest.Mock;
    save: jest.Mock;
  };
  let mockS3StorageService: {
    uploadImage: jest.Mock;
    deleteImage: jest.Mock;
  };

  // Test data
  const eventId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  const organizerId = 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e';
  const otherUserId = 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f';

  const validCommand = new UploadEventImageCommand(
    eventId,
    organizerId,
    Buffer.from('fake image data'),
    'event-image.jpg',
    'image/jpeg',
  );

  // Create a mock event factory
  function createMockEvent(overrides: Partial<{
    id: string;
    organizerId: string;
    status: EventStatus;
    imageUrl: string | null;
  }> = {}): EventEntity {
    const now = new Date();
    const futureStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    const futureEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000); // Day after

    const location = LocationVO.create({
      address: '123 Test Street',
      city: 'Test City',
      postalCode: '12345',
      country: 'France',
    });

    const dateRange = EventDateRangeVO.create(futureStart, futureEnd);

    const eventResult = EventEntity.create({
      id: overrides.id ?? eventId,
      organizerId: overrides.organizerId ?? organizerId,
      title: 'Test Event',
      description: 'A test event',
      category: EventCategory.CONCERT,
      location,
      dateRange,
      imageUrl: overrides.imageUrl ?? null,
    });

    const event = eventResult.value!;

    // Override status if needed (use reconstitute for non-DRAFT statuses)
    if (overrides.status && overrides.status !== EventStatus.DRAFT) {
      // For testing, we'll mock the status getter
      Object.defineProperty(event, 'status', {
        get: () => overrides.status,
      });
    }

    return event;
  }

  beforeEach(async () => {
    mockEventRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    mockS3StorageService = {
      uploadImage: jest.fn(),
      deleteImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadEventImageHandler,
        {
          provide: EVENT_REPOSITORY,
          useValue: mockEventRepository,
        },
        {
          provide: S3StorageService,
          useValue: mockS3StorageService,
        },
      ],
    }).compile();

    handler = module.get<UploadEventImageHandler>(UploadEventImageHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('successful upload', () => {
      it('should upload image for event without existing image', async () => {
        const event = createMockEvent();
        mockEventRepository.findById.mockResolvedValue(event);
        mockS3StorageService.uploadImage.mockResolvedValue({
          originalUrl: 'https://cdn.example.com/test/event-image.jpg',
          thumbnailUrl: 'https://cdn.example.com/test/event-image-thumb.jpg',
          key: 'test/event-image.jpg',
        });
        mockEventRepository.save.mockResolvedValue(event);

        const result = await handler.execute(validCommand);

        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual({
          imageUrl: 'https://cdn.example.com/test/event-image.jpg',
          thumbnailUrl: 'https://cdn.example.com/test/event-image-thumb.jpg',
        });
        expect(mockS3StorageService.deleteImage).not.toHaveBeenCalled();
        expect(mockS3StorageService.uploadImage).toHaveBeenCalledWith(
          validCommand.file,
          validCommand.eventId,
          validCommand.filename,
          validCommand.mimeType,
        );
        expect(mockEventRepository.save).toHaveBeenCalled();
      });

      it('should delete old image before uploading new one', async () => {
        const oldImageUrl = 'https://cdn.example.com/test/old-image.jpg';
        const event = createMockEvent({ imageUrl: oldImageUrl });
        
        // Need to mock the imageUrl getter
        Object.defineProperty(event, 'imageUrl', {
          get: () => oldImageUrl,
        });

        mockEventRepository.findById.mockResolvedValue(event);
        mockS3StorageService.deleteImage.mockResolvedValue(undefined);
        mockS3StorageService.uploadImage.mockResolvedValue({
          originalUrl: 'https://cdn.example.com/test/new-image.jpg',
          thumbnailUrl: 'https://cdn.example.com/test/new-image-thumb.jpg',
          key: 'test/new-image.jpg',
        });
        mockEventRepository.save.mockResolvedValue(event);

        const result = await handler.execute(validCommand);

        expect(result.isSuccess).toBe(true);
        expect(mockS3StorageService.deleteImage).toHaveBeenCalledWith(oldImageUrl);
        expect(mockS3StorageService.uploadImage).toHaveBeenCalled();
      });

      it('should continue upload if old image deletion fails', async () => {
        const oldImageUrl = 'https://cdn.example.com/test/old-image.jpg';
        const event = createMockEvent({ imageUrl: oldImageUrl });
        
        Object.defineProperty(event, 'imageUrl', {
          get: () => oldImageUrl,
        });

        mockEventRepository.findById.mockResolvedValue(event);
        mockS3StorageService.deleteImage.mockRejectedValue(new Error('Delete failed'));
        mockS3StorageService.uploadImage.mockResolvedValue({
          originalUrl: 'https://cdn.example.com/test/new-image.jpg',
          thumbnailUrl: 'https://cdn.example.com/test/new-image-thumb.jpg',
          key: 'test/new-image.jpg',
        });
        mockEventRepository.save.mockResolvedValue(event);

        const result = await handler.execute(validCommand);

        expect(result.isSuccess).toBe(true);
        expect(result.value?.imageUrl).toBe('https://cdn.example.com/test/new-image.jpg');
      });
    });

    describe('validation errors', () => {
      it('should fail if event not found', async () => {
        mockEventRepository.findById.mockResolvedValue(null);

        const result = await handler.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toEqual({
          type: 'EVENT_NOT_FOUND',
          message: `Event with id '${eventId}' not found`,
        });
      });

      it('should fail if user is not the organizer', async () => {
        const event = createMockEvent({ organizerId: otherUserId });
        mockEventRepository.findById.mockResolvedValue(event);

        const result = await handler.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error?.type).toBe('NOT_ORGANIZER');
      });

      it('should fail if event is cancelled', async () => {
        const event = createMockEvent({ status: EventStatus.CANCELLED });
        mockEventRepository.findById.mockResolvedValue(event);

        const result = await handler.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toEqual({
          type: 'EVENT_NOT_MODIFIABLE',
          message: 'Cannot upload image for a cancelled event',
        });
      });

      it('should fail if event is completed', async () => {
        const event = createMockEvent({ status: EventStatus.COMPLETED });
        mockEventRepository.findById.mockResolvedValue(event);

        const result = await handler.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toEqual({
          type: 'EVENT_NOT_MODIFIABLE',
          message: 'Cannot upload image for a completed event',
        });
      });
    });

    describe('S3 errors', () => {
      it('should fail with INVALID_FILE_TYPE for unsupported file types', async () => {
        const event = createMockEvent();
        mockEventRepository.findById.mockResolvedValue(event);
        mockS3StorageService.uploadImage.mockRejectedValue(
          InvalidFileTypeException.forImage('image/gif'),
        );

        const result = await handler.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error?.type).toBe('INVALID_FILE_TYPE');
      });

      it('should fail with FILE_TOO_LARGE for oversized files', async () => {
        const event = createMockEvent();
        mockEventRepository.findById.mockResolvedValue(event);
        mockS3StorageService.uploadImage.mockRejectedValue(
          FileSizeExceededException.forDefault(10 * 1024 * 1024),
        );

        const result = await handler.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error?.type).toBe('FILE_TOO_LARGE');
      });

      it('should fail with UPLOAD_FAILED for S3 errors', async () => {
        const event = createMockEvent();
        mockEventRepository.findById.mockResolvedValue(event);
        mockS3StorageService.uploadImage.mockRejectedValue(
          new S3UploadFailedException('test-bucket', 'test-key'),
        );

        const result = await handler.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error?.type).toBe('UPLOAD_FAILED');
      });

      it('should handle unknown errors gracefully', async () => {
        const event = createMockEvent();
        mockEventRepository.findById.mockResolvedValue(event);
        mockS3StorageService.uploadImage.mockRejectedValue(
          new Error('Unknown error'),
        );

        const result = await handler.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error?.type).toBe('UPLOAD_FAILED');
        expect(result.error?.message).toBe('Unknown error');
      });
    });
  });
});
