import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, ValidateIf } from 'class-validator';

export class SetEventFreeTicketsOverrideDto {
  @ApiProperty({
    type: Boolean,
    nullable: true,
    description:
      'true allows free tickets, false blocks them, null inherits FREE_TICKETS_ENABLED',
  })
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsBoolean()
  enabled!: boolean | null;
}

export class EventFreeTicketsPolicyDto {
  @ApiProperty({ format: 'uuid' })
  eventId!: string;

  @ApiProperty({ type: Boolean, nullable: true })
  freeTicketsEnabledOverride!: boolean | null;

  @ApiProperty({
    description: 'Resolved policy for new free ticket types and bookings',
  })
  effectiveFreeTicketsEnabled!: boolean;
}
