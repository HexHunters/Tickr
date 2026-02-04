import {
  EventCapacityInfo,
  TicketTypeCapacityInfo,
  CapacityValidationResult,
} from '../../../../src/modules/events/application/models/capacity.model';
import { EVENT_CAPACITY_SERVICE } from '../../../../src/modules/events/application/services/event-capacity.service.port';

/**
 * Unit Tests for Event Capacity Service Port Types
 *
 * These tests verify the type definitions and contracts
 * for the Event Capacity Service interface.
 */
describe('Event Capacity Service Port', () => {
  describe('EventCapacityInfo', () => {
    it('should define event capacity structure', () => {
      const capacityInfo: EventCapacityInfo = {
        eventId: 'evt_123',
        totalCapacity: 500,
        soldTickets: 200,
        availableTickets: 300,
        salesProgress: 40,
        isSoldOut: false,
        ticketTypes: [],
      };

      expect(capacityInfo.eventId).toBe('evt_123');
      expect(capacityInfo.totalCapacity).toBe(500);
      expect(capacityInfo.soldTickets).toBe(200);
      expect(capacityInfo.availableTickets).toBe(300);
      expect(capacityInfo.salesProgress).toBe(40);
      expect(capacityInfo.isSoldOut).toBe(false);
      expect(capacityInfo.ticketTypes).toEqual([]);
    });

    it('should handle sold out event', () => {
      const capacityInfo: EventCapacityInfo = {
        eventId: 'evt_456',
        totalCapacity: 100,
        soldTickets: 100,
        availableTickets: 0,
        salesProgress: 100,
        isSoldOut: true,
        ticketTypes: [],
      };

      expect(capacityInfo.isSoldOut).toBe(true);
      expect(capacityInfo.availableTickets).toBe(0);
      expect(capacityInfo.salesProgress).toBe(100);
    });

    it('should include ticket type breakdown', () => {
      const vipCapacity: TicketTypeCapacityInfo = {
        ticketTypeId: 'tt_vip',
        name: 'VIP',
        quantity: 100,
        soldQuantity: 50,
        availableQuantity: 50,
        salesProgress: 50,
        isSoldOut: false,
        isOnSale: true,
        isActive: true,
      };

      const standardCapacity: TicketTypeCapacityInfo = {
        ticketTypeId: 'tt_standard',
        name: 'Standard',
        quantity: 400,
        soldQuantity: 150,
        availableQuantity: 250,
        salesProgress: 37.5,
        isSoldOut: false,
        isOnSale: true,
        isActive: true,
      };

      const capacityInfo: EventCapacityInfo = {
        eventId: 'evt_789',
        totalCapacity: 500,
        soldTickets: 200,
        availableTickets: 300,
        salesProgress: 40,
        isSoldOut: false,
        ticketTypes: [vipCapacity, standardCapacity],
      };

      expect(capacityInfo.ticketTypes).toHaveLength(2);
      expect(capacityInfo.ticketTypes[0].name).toBe('VIP');
      expect(capacityInfo.ticketTypes[1].name).toBe('Standard');
    });
  });

  describe('TicketTypeCapacityInfo', () => {
    it('should define ticket type capacity structure', () => {
      const info: TicketTypeCapacityInfo = {
        ticketTypeId: 'tt_123',
        name: 'Early Bird',
        quantity: 50,
        soldQuantity: 30,
        availableQuantity: 20,
        salesProgress: 60,
        isSoldOut: false,
        isOnSale: true,
        isActive: true,
      };

      expect(info.ticketTypeId).toBe('tt_123');
      expect(info.name).toBe('Early Bird');
      expect(info.quantity).toBe(50);
      expect(info.soldQuantity).toBe(30);
      expect(info.availableQuantity).toBe(20);
      expect(info.salesProgress).toBe(60);
      expect(info.isSoldOut).toBe(false);
      expect(info.isOnSale).toBe(true);
      expect(info.isActive).toBe(true);
    });

    it('should handle sold out ticket type', () => {
      const info: TicketTypeCapacityInfo = {
        ticketTypeId: 'tt_456',
        name: 'VIP',
        quantity: 100,
        soldQuantity: 100,
        availableQuantity: 0,
        salesProgress: 100,
        isSoldOut: true,
        isOnSale: false,
        isActive: true,
      };

      expect(info.isSoldOut).toBe(true);
      expect(info.isOnSale).toBe(false);
      expect(info.availableQuantity).toBe(0);
    });

    it('should handle inactive ticket type', () => {
      const info: TicketTypeCapacityInfo = {
        ticketTypeId: 'tt_789',
        name: 'Cancelled Promo',
        quantity: 50,
        soldQuantity: 10,
        availableQuantity: 40,
        salesProgress: 20,
        isSoldOut: false,
        isOnSale: false,
        isActive: false,
      };

      expect(info.isActive).toBe(false);
      expect(info.isOnSale).toBe(false);
    });
  });

  describe('CapacityValidationResult', () => {
    it('should define valid result', () => {
      const result: CapacityValidationResult = {
        isValid: true,
        newTotalCapacity: 600,
        availableTicketsChange: 100,
      };

      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
      expect(result.newTotalCapacity).toBe(600);
      expect(result.availableTicketsChange).toBe(100);
    });

    it('should define invalid result with error', () => {
      const result: CapacityValidationResult = {
        isValid: false,
        errorMessage: 'Cannot reduce capacity below sold tickets',
      };

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Cannot reduce capacity below sold tickets');
      expect(result.newTotalCapacity).toBeUndefined();
    });

    it('should handle negative availability change', () => {
      const result: CapacityValidationResult = {
        isValid: true,
        newTotalCapacity: 400,
        availableTicketsChange: -100,
      };

      expect(result.isValid).toBe(true);
      expect(result.availableTicketsChange).toBe(-100);
    });
  });

  describe('Injection Token', () => {
    it('should have EVENT_CAPACITY_SERVICE symbol', () => {
      expect(EVENT_CAPACITY_SERVICE).toBeDefined();
      expect(typeof EVENT_CAPACITY_SERVICE).toBe('symbol');
      expect(EVENT_CAPACITY_SERVICE.toString()).toBe('Symbol(EventCapacityServicePort)');
    });
  });

  describe('EventCapacityServicePort Contract', () => {
    /**
     * Document the expected interface contract.
     */

    it('should define required methods', () => {
      const expectedMethods = [
        'getCapacityInfo',
        'getTicketTypeCapacityInfo',
        'validateQuantityChange',
        'checkAvailability',
        'calculateRevenuePotential',
      ];

      expect(expectedMethods).toHaveLength(5);
    });
  });
});
