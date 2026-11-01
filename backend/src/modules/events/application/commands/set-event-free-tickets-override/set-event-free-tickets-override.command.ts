export interface SetEventFreeTicketsOverrideCommand {
  eventId: string;
  adminId: string;
  enabled: boolean | null;
}

export type EventFreeTicketsPolicy = {
  eventId: string;
  freeTicketsEnabledOverride: boolean | null;
  effectiveFreeTicketsEnabled: boolean;
};