import {
  AssignEventCheckInStaffHandler,
  RevokeEventCheckInStaffHandler,
  GetEventCheckInStaffHandler,
  GetMyEventCheckInAccessHandler,
  ResolveEventCheckInAccessHandler,
} from '@modules/events/application';
import type { EventCheckInAccessListItem } from '@modules/events/application/models/event-check-in-access.model';
import { EVENT_CHECK_IN_ACCESS_READ_PORT } from '@modules/events/application/ports/event-check-in-access-read.port';
import type { EventCheckInAccessReadPort } from '@modules/events/application/ports/event-check-in-access-read.port';
import { EVENT_CHECK_IN_STAFF_ASSIGNMENT_REPOSITORY } from '@modules/events/application/ports/event-check-in-staff-assignment.repository.port';
import type { EventCheckInStaffAssignmentRepositoryPort } from '@modules/events/application/ports/event-check-in-staff-assignment.repository.port';
import { EVENT_STAFF_USER_DIRECTORY } from '@modules/events/application/ports/event-staff-user-directory.port';
import type { EventStaffUserDirectoryPort, EventStaffUserInterface } from '@modules/events/application/ports/event-staff-user-directory.port';
import type { EventCheckInStaffAssignmentEntity } from '@modules/events/domain/entities/event-check-in-staff-assignment.entity';
import type { Provider } from '@nestjs/common';

import {
  TEST_ORGANIZER_ID,
  TEST_OTHER_ORGANIZER_ID,
  TEST_PARTICIPANT_ID,
  TEST_ADMIN_ID,
  TEST_NO_EVENTS_ORGANIZER_ID,
} from './test-setup';
import type { InMemoryEventRepository } from './test-setup';

function paginate<T>(items: T[], page: number, limit: number) {
  return {
    data: items.slice((page - 1) * limit, page * limit),
    total: items.length,
    page,
    limit,
    totalPages: Math.ceil(items.length / limit),
    hasNextPage: page * limit < items.length,
    hasPreviousPage: page > 1,
  };
}

/** Real staff handlers with per-suite state; no database or permissive guards. */
export function createCheckInStaffFixture(events: InMemoryEventRepository) {
  const assignments = new Map<string, EventCheckInStaffAssignmentEntity>();
  const users = new Map<string, EventStaffUserInterface>();
  const repository: EventCheckInStaffAssignmentRepositoryPort = {
    async save(assignment) {
      assignments.set(assignment.id, assignment);
      return assignment;
    },
    async findById(id) {
      return assignments.get(id) ?? null;
    },
    async findActiveByEventAndUser(eventId, userId) {
      return [...assignments.values()].find(
        (entry) => entry.eventId === eventId && entry.userId === userId && entry.isActive,
      ) ?? null;
    },
    async findByEvent(eventId, page, limit, includeRevoked = false) {
      return paginate([...assignments.values()].filter(
        (entry) => entry.eventId === eventId && (includeRevoked || entry.isActive),
      ), page, limit);
    },
    async findActiveByUser(userId, page, limit) {
      return paginate([...assignments.values()].filter(
        (entry) => entry.userId === userId && entry.isActive,
      ), page, limit);
    },
    async revoke(assignment) {
      if (!assignments.has(assignment.id)) return false;
      assignments.set(assignment.id, assignment);
      return true;
    },
  };
  // Read current account state on every request, rather than trusting token roles.
  const directory: EventStaffUserDirectoryPort = {
    async getUserById(id) { return users.get(id) ?? null; },
    async getUserByEmail(email) {
      return [...users.values()].find(
        (user) => user.email.toLowerCase() === email.toLowerCase(),
      ) ?? null;
    },
    async getUsersByIds(ids) {
      return [...users.values()].filter((user) => ids.includes(user.id));
    },
  };
  const accessRead: EventCheckInAccessReadPort = {
    async findAccessibleEvents(userId, isAdmin, page, limit) {
      const accessible: EventCheckInAccessListItem[] = [];
      for (const event of events.getAllEvents()) {
        if (event.status !== 'PUBLISHED' || event.dateRange.endDate <= new Date()) continue;
        const isOwner = event.organizerId === userId;
        const assignment = await repository.findActiveByEventAndUser(event.id, userId);
        if (!isAdmin && !isOwner && !assignment) continue;
        accessible.push({
          eventId: event.id,
          title: event.title,
          status: event.status,
          startDate: event.dateRange.startDate,
          endDate: event.dateRange.endDate,
          authorizationSource: isAdmin ? 'ADMIN' : isOwner ? 'OWNER' : 'ASSIGNMENT',
          assignmentId: isAdmin || isOwner ? null : assignment?.id ?? null,
        });
      }
      accessible.sort((a, b) => a.startDate.getTime() - b.startDate.getTime() || a.eventId.localeCompare(b.eventId));
      return paginate(accessible, page, limit);
    },
  };
  function reset() {
    assignments.clear();
    users.clear();
    const accounts: Array<[string, string, EventStaffUserInterface['role']]> = [
      [TEST_ORGANIZER_ID, 'organizer@test.com', 'ORGANIZER'],
      [TEST_OTHER_ORGANIZER_ID, 'other-organizer@test.com', 'ORGANIZER'],
      [TEST_PARTICIPANT_ID, 'participant@test.com', 'PARTICIPANT'],
      [TEST_ADMIN_ID, 'admin@test.com', 'ADMIN'],
      [TEST_NO_EVENTS_ORGANIZER_ID, 'no-events@test.com', 'ORGANIZER'],
    ];
    for (const [id, email, role] of accounts) {
      users.set(id, { id, email, role, firstName: 'Test', lastName: role, isActive: true, emailVerified: true });
    }
  }
  reset();
  const providers: Provider[] = [
    AssignEventCheckInStaffHandler,
    RevokeEventCheckInStaffHandler,
    GetEventCheckInStaffHandler,
    GetMyEventCheckInAccessHandler,
    ResolveEventCheckInAccessHandler,
    { provide: EVENT_CHECK_IN_STAFF_ASSIGNMENT_REPOSITORY, useValue: repository },
    { provide: EVENT_STAFF_USER_DIRECTORY, useValue: directory },
    { provide: EVENT_CHECK_IN_ACCESS_READ_PORT, useValue: accessRead },
  ];
  return { providers, reset, users, repository };
}