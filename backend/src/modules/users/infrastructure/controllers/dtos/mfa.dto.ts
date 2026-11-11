import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsJWT, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const TOTP_CODE = /^\d{6}$/;
const RECOVERY_CODE = /^[A-Za-z0-9 -]{10,13}$/;

/**
 * Sign-in challenge returned by POST /auth/login when a second factor is required
 */
export class MfaChallengeDto {
  @ApiProperty({ description: 'mfaToken from POST /auth/login (valid 5 minutes)' })
  @IsJWT()
  readonly mfaToken!: string;
}

export class ConfirmMfaEnrollmentDto extends MfaChallengeDto {
  @ApiProperty({ example: '123456', description: '6-digit code from the authenticator app' })
  @IsString()
  @Matches(TOTP_CODE, { message: 'code must be 6 digits' })
  readonly code!: string;
}

/**
 * Exactly one of `code` or `recoveryCode`
 */
export class VerifyMfaDto extends MfaChallengeDto {
  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @Matches(TOTP_CODE, { message: 'code must be 6 digits' })
  readonly code?: string;

  @ApiPropertyOptional({ example: 'ABCDE-FGH23' })
  @IsOptional()
  @IsString()
  @MaxLength(13)
  @Matches(RECOVERY_CODE, { message: 'recoveryCode is malformed' })
  readonly recoveryCode?: string;
}

export class RegenerateRecoveryCodesDto {
  @ApiProperty({ example: '123456', description: 'Current code from the authenticator app' })
  @IsString()
  @Matches(TOTP_CODE, { message: 'code must be 6 digits' })
  readonly code!: string;
}
