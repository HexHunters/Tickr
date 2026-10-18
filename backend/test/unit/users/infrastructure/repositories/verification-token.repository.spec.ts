import {
  TokenType,
  VerificationTokenEntity,
} from '@modules/users/infrastructure/persistence/entities/verification-token.orm-entity';
import { VerificationTokenRepository } from '@modules/users/infrastructure/persistence/repositories/verification-token.repository';
import { TokenService } from '@modules/users/infrastructure/services/token.service';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('VerificationTokenRepository', () => {
  const now = new Date('2026-10-18T12:00:00Z');
  const mockRepository = { findOne: jest.fn() };
  let repository: VerificationTokenRepository;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(now);
    mockRepository.findOne.mockReset();
    const module = await Test.createTestingModule({
      providers: [
        VerificationTokenRepository,
        { provide: getRepositoryToken(VerificationTokenEntity), useValue: mockRepository },
        { provide: TokenService, useValue: {} },
      ],
    }).compile();
    repository = module.get(VerificationTokenRepository);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([TokenType.EMAIL_VERIFICATION, TokenType.PASSWORD_RESET])(
    'rejects %s tokens at and after expiry, but accepts an unused future token',
    async (tokenType) => {
      const entity = new VerificationTokenEntity();
      entity.token = 'test-token';
      entity.tokenType = tokenType;
      entity.usedAt = null;
      mockRepository.findOne.mockResolvedValue(entity);

      for (const offset of [-1, 0]) {
        entity.expiresAt = new Date(now.getTime() + offset);
        expect(await repository.findValidToken(entity.token, tokenType)).toBeNull();
      }

      entity.expiresAt = new Date(now.getTime() + 1);
      expect(await repository.findValidToken(entity.token, tokenType)).toBe(entity);

      entity.usedAt = now;
      expect(await repository.findValidToken(entity.token, tokenType)).toBeNull();
    },
  );

  it('rejects an unknown token and scopes the lookup by purpose', async () => {
    mockRepository.findOne.mockResolvedValue(null);

    expect(await repository.findValidToken('missing', TokenType.PASSWORD_RESET)).toBeNull();
    expect(mockRepository.findOne).toHaveBeenCalledWith({
      where: expect.objectContaining({ token: 'missing', tokenType: TokenType.PASSWORD_RESET }),
    });
  });
});