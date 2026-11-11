import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * One-time recovery code (keyed hash only). See migration AddAdminMfa.
 */
@Entity({ name: 'mfa_recovery_codes', schema: 'users' })
@Unique('UQ_mfa_recovery_codes_user_code', ['userId', 'codeHash'])
export class MfaRecoveryCodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'code_hash', type: 'varchar', length: 64 })
  codeHash!: string;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
