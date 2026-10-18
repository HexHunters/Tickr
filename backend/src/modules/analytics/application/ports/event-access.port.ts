export const EVENT_ACCESS_PORT = Symbol('ANALYTICS_EVENT_ACCESS_PORT');

export interface EventAccessPort {
  findOrganizerId(eventId: string): Promise<string | null>;
}