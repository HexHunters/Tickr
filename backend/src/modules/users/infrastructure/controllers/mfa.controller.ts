import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ConfirmMfaEnrollmentCommand } from '../../application/commands/confirm-mfa-enrollment.command';
import { ConfirmMfaEnrollmentHandler } from '../../application/commands/confirm-mfa-enrollment.handler';
import { RegenerateRecoveryCodesCommand } from '../../application/commands/regenerate-recovery-codes.command';
import { RegenerateRecoveryCodesHandler } from '../../application/commands/regenerate-recovery-codes.handler';
import { StartMfaEnrollmentCommand } from '../../application/commands/start-mfa-enrollment.command';
import { StartMfaEnrollmentHandler } from '../../application/commands/start-mfa-enrollment.handler';
import type { MfaEnrollmentSetup } from '../../application/commands/start-mfa-enrollment.handler';
import { VerifyMfaCommand } from '../../application/commands/verify-mfa.command';
import { VerifyMfaHandler } from '../../application/commands/verify-mfa.handler';
import { USER_REPOSITORY } from '../../application/ports/user.repository.port';
import type { UserEntityPort, UserRepositoryPort } from '../../application/ports/user.repository.port';
import { GetMfaStatusHandler } from '../../application/queries/get-mfa-status.handler';
import { GetMfaStatusQuery } from '../../application/queries/get-mfa-status.query';
import type { MfaStatus } from '../../application/queries/get-mfa-status.query';
import type { MfaCodeError } from '../../application/services/mfa-code-verifier.service';
import { UserRole, UserRoleVO } from '../../domain/value-objects/user-role.vo';
import { CurrentUser, Public } from '../decorators/auth.decorators';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JwtTokenService } from '../services/jwt.service';

import {
  ConfirmMfaEnrollmentDto,
  MfaChallengeDto,
  RegenerateRecoveryCodesDto,
  VerifyMfaDto,
} from './dtos/mfa.dto';


interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: string; email: string; firstName: string; lastName: string; role: string };
}

/** Same limits as POST /auth/login: these steps finish a sign-in. */
const SIGN_IN_STEP_THROTTLE = {
  short: { ttl: 900000, limit: 10 },
  medium: { ttl: 900000, limit: 10 },
  long: { ttl: 900000, limit: 10 },
};

/**
 * Two-factor authentication (authenticator app, RFC 6238 TOTP)
 *
 * Sign-in: POST /auth/login returns { mfaRequired, mfaMethod, mfaToken } for
 * administrators. ENROLL → enroll/start (QR code) then enroll/confirm (first
 * code, recovery codes shown once). VERIFY → verify with a code or a recovery
 * code. Both open the session with tokens marked `mfa`.
 */
@ApiTags('Authentication - Two-factor')
@Controller()
export class MfaController {
  constructor(
    private readonly jwtService: JwtTokenService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    private readonly startEnrollmentHandler: StartMfaEnrollmentHandler,
    private readonly confirmEnrollmentHandler: ConfirmMfaEnrollmentHandler,
    private readonly verifyHandler: VerifyMfaHandler,
    private readonly regenerateHandler: RegenerateRecoveryCodesHandler,
    private readonly statusHandler: GetMfaStatusHandler,
  ) {}

  @Public()
  @Post('auth/mfa/enroll/start')
  @Throttle(SIGN_IN_STEP_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'First sign-in: get the authenticator QR code and key' })
  @ApiResponse({ status: 200, description: '{ secret, otpauthUri, qrCodeDataUrl }' })
  @ApiResponse({ status: 401, description: 'Sign-in challenge invalid or expired' })
  @ApiResponse({ status: 409, description: 'MFA_ALREADY_ENROLLED' })
  async startEnrollment(@Body() dto: MfaChallengeDto): Promise<MfaEnrollmentSetup> {
    const user = await this.challengedUser(dto.mfaToken);
    if (!UserRoleVO.fromEnum(user.role).requiresMfa()) {
      throw new ForbiddenException('Two-factor enrollment is not available for this account');
    }
    const result = await this.startEnrollmentHandler.execute(
      new StartMfaEnrollmentCommand(user.id, user.email),
    );
    if (result.isFailure) {
      throw new ConflictException({ code: result.error.type, message: result.error.message });
    }
    return result.value;
  }

  @Public()
  @Post('auth/mfa/enroll/confirm')
  @Throttle(SIGN_IN_STEP_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'First sign-in: confirm the authenticator and open the session' })
  @ApiResponse({ status: 200, description: 'Session tokens and the recovery codes (shown once)' })
  @ApiResponse({ status: 401, description: 'INVALID_MFA_CODE or expired challenge' })
  @ApiResponse({ status: 409, description: 'MFA_ALREADY_ENROLLED or MFA_ENROLLMENT_NOT_STARTED' })
  @ApiResponse({ status: 429, description: 'MFA_LOCKED after too many invalid codes' })
  async confirmEnrollment(
    @Body() dto: ConfirmMfaEnrollmentDto,
  ): Promise<SessionResponse & { recoveryCodes: string[] }> {
    const user = await this.challengedUser(dto.mfaToken);
    const result = await this.confirmEnrollmentHandler.execute(
      new ConfirmMfaEnrollmentCommand(user.id, dto.code),
    );
    if (result.isFailure) {
      const error = result.error;
      if (error.type === 'MFA_ALREADY_ENROLLED' || error.type === 'MFA_ENROLLMENT_NOT_STARTED') {
        throw new ConflictException({ code: error.type, message: error.message });
      }
      throw this.codeError(error);
    }
    return { ...(await this.openSession(user)), recoveryCodes: result.value.recoveryCodes };
  }

  @Public()
  @Post('auth/mfa/verify')
  @Throttle(SIGN_IN_STEP_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign-in: verify an authenticator or recovery code and open the session' })
  @ApiResponse({ status: 200, description: 'Session tokens and the number of recovery codes left' })
  @ApiResponse({ status: 400, description: 'Send exactly one of code or recoveryCode' })
  @ApiResponse({ status: 401, description: 'INVALID_MFA_CODE or expired challenge' })
  @ApiResponse({ status: 429, description: 'MFA_LOCKED after too many invalid codes' })
  async verify(
    @Body() dto: VerifyMfaDto,
  ): Promise<SessionResponse & { method: string; remainingRecoveryCodes: number }> {
    if (Boolean(dto.code) === Boolean(dto.recoveryCode)) {
      throw new BadRequestException('Send exactly one of code or recoveryCode');
    }
    const user = await this.challengedUser(dto.mfaToken);
    const result = await this.verifyHandler.execute(
      new VerifyMfaCommand(user.id, dto.code, dto.recoveryCode),
    );
    if (result.isFailure) throw this.codeError(result.error);
    return { ...(await this.openSession(user)), ...result.value };
  }

  @Get('users/me/mfa')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Two-factor status of the signed-in account' })
  @ApiResponse({ status: 200, description: '{ enabled, enabledAt, required, remainingRecoveryCodes }' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  status(@CurrentUser() user: { userId: string; role: string }): Promise<MfaStatus> {
    return this.statusHandler.execute(new GetMfaStatusQuery(user.userId, user.role as UserRole));
  }

  @Post('users/me/mfa/recovery-codes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle(SIGN_IN_STEP_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace all recovery codes (requires a current authenticator code)' })
  @ApiResponse({ status: 200, description: '{ recoveryCodes } (shown once)' })
  @ApiResponse({ status: 401, description: 'INVALID_MFA_CODE' })
  @ApiResponse({ status: 409, description: 'MFA_NOT_ENROLLED' })
  @ApiResponse({ status: 429, description: 'MFA_LOCKED' })
  async regenerateRecoveryCodes(
    @CurrentUser() user: { userId: string },
    @Body() dto: RegenerateRecoveryCodesDto,
  ): Promise<{ recoveryCodes: string[] }> {
    const result = await this.regenerateHandler.execute(
      new RegenerateRecoveryCodesCommand(user.userId, dto.code),
    );
    if (result.isFailure) throw this.codeError(result.error);
    return result.value;
  }

  /** The account behind a sign-in challenge, still allowed to sign in. */
  private async challengedUser(mfaToken: string): Promise<UserEntityPort> {
    const challenge = await this.jwtService.verifyMfaChallengeToken(mfaToken).catch(() => {
      throw new UnauthorizedException({
        code: 'MFA_CHALLENGE_EXPIRED',
        message: 'Sign-in expired. Enter your password again.',
      });
    });
    const user = await this.userRepository.findById(challenge.userId);
    if (!user?.isActive || !user.emailVerified) {
      throw new UnauthorizedException({
        code: 'MFA_CHALLENGE_EXPIRED',
        message: 'Sign-in expired. Enter your password again.',
      });
    }
    return user;
  }

  private async openSession(user: UserEntityPort): Promise<SessionResponse> {
    const tokens = this.jwtService.generateTokenPair(
      { userId: user.id, email: user.email, role: user.role },
      { mfa: true },
    );
    await this.userRepository.updateLastLogin(user.id);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  private codeError(error: MfaCodeError): HttpException {
    switch (error.type) {
      case 'INVALID_MFA_CODE':
        return new UnauthorizedException({ code: error.type, message: error.message });
      case 'MFA_LOCKED':
        return new HttpException(
          { code: error.type, message: error.message },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      case 'MFA_NOT_ENROLLED':
        return new ConflictException({ code: error.type, message: error.message });
    }
  }
}
