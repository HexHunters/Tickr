import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for cancelling an event
 *
 * Uses class-validator decorators for input validation.
 */
export class CancelEventDto {
  @ApiProperty({
    description: 'Reason for cancellation',
    example: 'Venue no longer available due to unforeseen circumstances',
    minLength: 1,
    maxLength: 1000,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;
}
