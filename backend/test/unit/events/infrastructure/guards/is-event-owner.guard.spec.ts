/**
 * IsEventOwnerGuard Unit Tests
 *
 * Tests for the guard that validates event ownership before allowing mutations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';

import { IsEventOwnerGuard } from '@modules/events/infrastructure/guards/is-event-owner.guard';
import { EVENT_REPOSITORY } from '@modules/events/application/ports/event.repository.port';

describe('IsEventOwnerGuard', () => {
  let guard: IsEventOwnerGuard;
  let mockEventRepository: {
    findById: jest.Mock;
  };

  const createMockExecutionContext = (
    params: Record<string, string>,
    user?: Record<string, unknown>,
  ): ExecutionContext => {
    const mockRequest: Record<string, unknown> = {
      params,
      user,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  const createMockEvent = (organizerId: string) => ({
    id: 'event-123',
    organizerId,
    title: 'Test Event',
    status: 'DRAFT',
  });

  beforeEach(async () => {
    mockEventRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IsEventOwnerGuard,
        { provide: EVENT_REPOSITORY, useValue: mockEventRepository },
      ],
    }).compile();

    guard = module.get<IsEventOwnerGuard>(IsEventOwnerGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    describe('authentication validation', () => {
      it('should throw ForbiddenException when user is not authenticated', async () => {
        const context = createMockExecutionContext({ id: 'event-123' });

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
        await expect(guard.canActivate(context)).rejects.toThrow('Authentication required');
      });
    });

    describe('event ID validation', () => {
      it('should throw ForbiddenException when event ID is missing from params', async () => {
        const context = createMockExecutionContext(
          {},
          { userId: 'user-123', email: 'test@example.com', role: 'ORGANIZER' },
        );

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
        await expect(guard.canActivate(context)).rejects.toThrow('Event ID is required');
      });

      it('should accept :id param pattern', async () => {
        const event = createMockEvent('user-123');
        mockEventRepository.findById.mockResolvedValue(event);

        const context = createMockExecutionContext(
          { id: 'event-123' },
          { userId: 'user-123', email: 'test@example.com', role: 'ORGANIZER' },
        );

        await guard.canActivate(context);

        expect(mockEventRepository.findById).toHaveBeenCalledWith('event-123');
      });

      it('should accept :eventId param pattern', async () => {
        const event = createMockEvent('user-123');
        mockEventRepository.findById.mockResolvedValue(event);

        const context = createMockExecutionContext(
          { eventId: 'event-456' },
          { userId: 'user-123', email: 'test@example.com', role: 'ORGANIZER' },
        );

        await guard.canActivate(context);

        expect(mockEventRepository.findById).toHaveBeenCalledWith('event-456');
      });
    });

    describe('event existence', () => {
      it('should throw NotFoundException when event does not exist', async () => {
        mockEventRepository.findById.mockResolvedValue(null);

        const context = createMockExecutionContext(
          { id: 'nonexistent-event' },
          { userId: 'user-123', email: 'test@example.com', role: 'ORGANIZER' },
        );

        await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
        await expect(guard.canActivate(context)).rejects.toThrow(
          "Event with id 'nonexistent-event' not found",
        );
      });
    });

    describe('ownership validation', () => {
      it('should return true when user is the event owner', async () => {
        const event = createMockEvent('user-123');
        mockEventRepository.findById.mockResolvedValue(event);

        const context = createMockExecutionContext(
          { id: 'event-123' },
          { userId: 'user-123', email: 'test@example.com', role: 'ORGANIZER' },
        );

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockEventRepository.findById).toHaveBeenCalledWith('event-123');
      });

      it('should throw ForbiddenException when user is not the owner', async () => {
        const event = createMockEvent('other-user');
        mockEventRepository.findById.mockResolvedValue(event);

        const context = createMockExecutionContext(
          { id: 'event-123' },
          { userId: 'user-123', email: 'test@example.com', role: 'ORGANIZER' },
        );

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
        await expect(guard.canActivate(context)).rejects.toThrow(
          'You do not have permission to modify this event',
        );
      });

      it('should deny access to admins who are not the owner (strict ownership)', async () => {
        // Guard strictly checks ownership - admins should use separate admin endpoints
        const event = createMockEvent('other-user');
        mockEventRepository.findById.mockResolvedValue(event);

        const context = createMockExecutionContext(
          { id: 'event-123' },
          { userId: 'admin-123', email: 'admin@example.com', role: 'ADMIN' },
        );

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      });
    });

    describe('request optimization', () => {
      it('should attach event to request for reuse in handler', async () => {
        const event = createMockEvent('user-123');
        mockEventRepository.findById.mockResolvedValue(event);

        const mockRequest: Record<string, unknown> = {
          params: { id: 'event-123' },
          user: { userId: 'user-123', email: 'test@example.com', role: 'ORGANIZER' },
        };

        const context = {
          switchToHttp: () => ({
            getRequest: () => mockRequest,
          }),
          getHandler: () => ({}),
          getClass: () => ({}),
        } as unknown as ExecutionContext;

        await guard.canActivate(context);

        expect(mockRequest.event).toBe(event);
      });
    });

    describe('error handling', () => {
      it('should propagate repository errors', async () => {
        mockEventRepository.findById.mockRejectedValue(new Error('Database error'));

        const context = createMockExecutionContext(
          { id: 'event-123' },
          { userId: 'user-123', email: 'test@example.com', role: 'ORGANIZER' },
        );

        await expect(guard.canActivate(context)).rejects.toThrow('Database error');
      });
    });
  });
});
