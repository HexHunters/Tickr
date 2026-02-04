import {
  EventStatus,
  EventStatusVO,
  EVENT_STATUS_METADATA,
  EVENT_STATUS_TRANSITIONS,
} from '@modules/events/domain/value-objects/event-status.vo';

describe('EventStatus', () => {
  describe('EventStatus enum', () => {
    it('should have all required statuses', () => {
      expect(EventStatus.DRAFT).toBe('DRAFT');
      expect(EventStatus.PUBLISHED).toBe('PUBLISHED');
      expect(EventStatus.CANCELLED).toBe('CANCELLED');
      expect(EventStatus.COMPLETED).toBe('COMPLETED');
    });

    it('should have exactly 4 statuses', () => {
      expect(Object.keys(EventStatus)).toHaveLength(4);
    });
  });

  describe('EVENT_STATUS_METADATA', () => {
    it('should have metadata for all statuses', () => {
      Object.values(EventStatus).forEach((status) => {
        const metadata = EVENT_STATUS_METADATA[status];
        expect(metadata).toBeDefined();
        expect(metadata.displayName).toBeDefined();
        expect(metadata.displayNameFr).toBeDefined();
        expect(metadata.description).toBeDefined();
        expect(metadata.color).toBeDefined();
        expect(metadata.bgColor).toBeDefined();
      });
    });

    it('should have valid color formats (hex)', () => {
      Object.values(EVENT_STATUS_METADATA).forEach((metadata) => {
        expect(metadata.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(metadata.bgColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('EVENT_STATUS_TRANSITIONS', () => {
    it('should allow DRAFT to transition to PUBLISHED or CANCELLED', () => {
      const transitions = EVENT_STATUS_TRANSITIONS[EventStatus.DRAFT];
      expect(transitions).toContain(EventStatus.PUBLISHED);
      expect(transitions).toContain(EventStatus.CANCELLED);
      expect(transitions).toHaveLength(2);
    });

    it('should allow PUBLISHED to transition to CANCELLED or COMPLETED', () => {
      const transitions = EVENT_STATUS_TRANSITIONS[EventStatus.PUBLISHED];
      expect(transitions).toContain(EventStatus.CANCELLED);
      expect(transitions).toContain(EventStatus.COMPLETED);
      expect(transitions).toHaveLength(2);
    });

    it('should not allow CANCELLED to transition (terminal state)', () => {
      const transitions = EVENT_STATUS_TRANSITIONS[EventStatus.CANCELLED];
      expect(transitions).toHaveLength(0);
    });

    it('should not allow COMPLETED to transition (terminal state)', () => {
      const transitions = EVENT_STATUS_TRANSITIONS[EventStatus.COMPLETED];
      expect(transitions).toHaveLength(0);
    });
  });

  describe('EventStatusVO', () => {
    describe('create', () => {
      it('should create from valid string', () => {
        const status = EventStatusVO.create('DRAFT');
        expect(status.value).toBe(EventStatus.DRAFT);
      });

      it('should create from lowercase string (case insensitive)', () => {
        const status = EventStatusVO.create('published');
        expect(status.value).toBe(EventStatus.PUBLISHED);
      });

      it('should throw for invalid status', () => {
        expect(() => EventStatusVO.create('INVALID')).toThrow();
      });
    });

    describe('fromEnum', () => {
      it('should create from enum value', () => {
        const status = EventStatusVO.fromEnum(EventStatus.PUBLISHED);
        expect(status.value).toBe(EventStatus.PUBLISHED);
      });
    });

    describe('draft', () => {
      it('should create a DRAFT status', () => {
        const status = EventStatusVO.draft();
        expect(status.value).toBe(EventStatus.DRAFT);
      });
    });

    describe('getMetadata', () => {
      it('should return metadata for status', () => {
        const status = EventStatusVO.fromEnum(EventStatus.PUBLISHED);
        const metadata = status.getMetadata();
        expect(metadata.displayName).toBe('Published');
        expect(metadata.color).toBe('#4CAF50');
      });
    });

    describe('getDisplayName', () => {
      it('should return English display name by default', () => {
        const status = EventStatusVO.fromEnum(EventStatus.CANCELLED);
        expect(status.getDisplayName()).toBe('Cancelled');
      });

      it('should return French display name when locale is fr', () => {
        const status = EventStatusVO.fromEnum(EventStatus.DRAFT);
        expect(status.getDisplayName('fr')).toBe('Brouillon');
      });
    });

    describe('canTransitionTo', () => {
      it('should return true for valid transition', () => {
        const draft = EventStatusVO.fromEnum(EventStatus.DRAFT);
        expect(draft.canTransitionTo(EventStatus.PUBLISHED)).toBe(true);
      });

      it('should return false for invalid transition', () => {
        const draft = EventStatusVO.fromEnum(EventStatus.DRAFT);
        expect(draft.canTransitionTo(EventStatus.COMPLETED)).toBe(false);
      });
    });

    describe('getAllowedTransitions', () => {
      it('should return allowed transitions', () => {
        const published = EventStatusVO.fromEnum(EventStatus.PUBLISHED);
        const transitions = published.getAllowedTransitions();
        expect(transitions).toContain(EventStatus.CANCELLED);
        expect(transitions).toContain(EventStatus.COMPLETED);
      });
    });

    describe('status checks', () => {
      it('isPublic should return true only for PUBLISHED', () => {
        expect(EventStatusVO.fromEnum(EventStatus.DRAFT).isPublic()).toBe(false);
        expect(EventStatusVO.fromEnum(EventStatus.PUBLISHED).isPublic()).toBe(true);
        expect(EventStatusVO.fromEnum(EventStatus.CANCELLED).isPublic()).toBe(false);
        expect(EventStatusVO.fromEnum(EventStatus.COMPLETED).isPublic()).toBe(false);
      });

      it('isCancellable should return true for DRAFT and PUBLISHED', () => {
        expect(EventStatusVO.fromEnum(EventStatus.DRAFT).isCancellable()).toBe(true);
        expect(EventStatusVO.fromEnum(EventStatus.PUBLISHED).isCancellable()).toBe(true);
        expect(EventStatusVO.fromEnum(EventStatus.CANCELLED).isCancellable()).toBe(false);
        expect(EventStatusVO.fromEnum(EventStatus.COMPLETED).isCancellable()).toBe(false);
      });

      it('isModifiable should return true only for DRAFT', () => {
        expect(EventStatusVO.fromEnum(EventStatus.DRAFT).isModifiable()).toBe(true);
        expect(EventStatusVO.fromEnum(EventStatus.PUBLISHED).isModifiable()).toBe(false);
        expect(EventStatusVO.fromEnum(EventStatus.CANCELLED).isModifiable()).toBe(false);
        expect(EventStatusVO.fromEnum(EventStatus.COMPLETED).isModifiable()).toBe(false);
      });

      it('isTerminal should return true for CANCELLED and COMPLETED', () => {
        expect(EventStatusVO.fromEnum(EventStatus.DRAFT).isTerminal()).toBe(false);
        expect(EventStatusVO.fromEnum(EventStatus.PUBLISHED).isTerminal()).toBe(false);
        expect(EventStatusVO.fromEnum(EventStatus.CANCELLED).isTerminal()).toBe(true);
        expect(EventStatusVO.fromEnum(EventStatus.COMPLETED).isTerminal()).toBe(true);
      });

      it('canPurchaseTickets should return true only for PUBLISHED', () => {
        expect(EventStatusVO.fromEnum(EventStatus.DRAFT).canPurchaseTickets()).toBe(false);
        expect(EventStatusVO.fromEnum(EventStatus.PUBLISHED).canPurchaseTickets()).toBe(true);
        expect(EventStatusVO.fromEnum(EventStatus.CANCELLED).canPurchaseTickets()).toBe(false);
        expect(EventStatusVO.fromEnum(EventStatus.COMPLETED).canPurchaseTickets()).toBe(false);
      });

      it('isDraft should return true only for DRAFT', () => {
        expect(EventStatusVO.fromEnum(EventStatus.DRAFT).isDraft()).toBe(true);
        expect(EventStatusVO.fromEnum(EventStatus.PUBLISHED).isDraft()).toBe(false);
      });

      it('isPublished should return true only for PUBLISHED', () => {
        expect(EventStatusVO.fromEnum(EventStatus.PUBLISHED).isPublished()).toBe(true);
        expect(EventStatusVO.fromEnum(EventStatus.DRAFT).isPublished()).toBe(false);
      });

      it('isCancelled should return true only for CANCELLED', () => {
        expect(EventStatusVO.fromEnum(EventStatus.CANCELLED).isCancelled()).toBe(true);
        expect(EventStatusVO.fromEnum(EventStatus.DRAFT).isCancelled()).toBe(false);
      });

      it('isCompleted should return true only for COMPLETED', () => {
        expect(EventStatusVO.fromEnum(EventStatus.COMPLETED).isCompleted()).toBe(true);
        expect(EventStatusVO.fromEnum(EventStatus.DRAFT).isCompleted()).toBe(false);
      });
    });

    describe('equals', () => {
      it('should return true for same statuses', () => {
        const status1 = EventStatusVO.fromEnum(EventStatus.DRAFT);
        const status2 = EventStatusVO.fromEnum(EventStatus.DRAFT);
        expect(status1.equals(status2)).toBe(true);
      });

      it('should return false for different statuses', () => {
        const status1 = EventStatusVO.fromEnum(EventStatus.DRAFT);
        const status2 = EventStatusVO.fromEnum(EventStatus.PUBLISHED);
        expect(status1.equals(status2)).toBe(false);
      });
    });

    describe('toString', () => {
      it('should return status string', () => {
        const status = EventStatusVO.fromEnum(EventStatus.COMPLETED);
        expect(status.toString()).toBe('COMPLETED');
      });
    });

    describe('static getAllStatuses', () => {
      it('should return all statuses', () => {
        const statuses = EventStatusVO.getAllStatuses();
        expect(statuses).toHaveLength(4);
        expect(statuses).toContain(EventStatus.DRAFT);
        expect(statuses).toContain(EventStatus.PUBLISHED);
        expect(statuses).toContain(EventStatus.CANCELLED);
        expect(statuses).toContain(EventStatus.COMPLETED);
      });
    });

    describe('static isValidStatus', () => {
      it('should return true for valid status', () => {
        expect(EventStatusVO.isValidStatus('DRAFT')).toBe(true);
        expect(EventStatusVO.isValidStatus('draft')).toBe(true);
      });

      it('should return false for invalid status', () => {
        expect(EventStatusVO.isValidStatus('INVALID')).toBe(false);
      });
    });

    describe('static canTransition', () => {
      it('should return true for valid transition', () => {
        expect(EventStatusVO.canTransition(EventStatus.DRAFT, EventStatus.PUBLISHED)).toBe(true);
      });

      it('should return false for invalid transition', () => {
        expect(EventStatusVO.canTransition(EventStatus.COMPLETED, EventStatus.DRAFT)).toBe(false);
      });
    });

    describe('static fromString', () => {
      it('should return EventStatusVO for valid string', () => {
        const status = EventStatusVO.fromString('PUBLISHED');
        expect(status).not.toBeNull();
        expect(status!.value).toBe(EventStatus.PUBLISHED);
      });

      it('should return null for invalid string', () => {
        const status = EventStatusVO.fromString('INVALID');
        expect(status).toBeNull();
      });
    });
  });
});
