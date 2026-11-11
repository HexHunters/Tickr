import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Second factor (TOTP) of one account. See migration AddAdminMfa.
 */
@Entity({ name: 'user_mfa', schema: 'users' })
export class UserMfaEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'secret_encrypted', type: 'text', nullable: true })
  secretEncrypted!: string | null;

  @Column({ name: 'pending_secret_encrypted', type: 'text', nullable: true })
  pendingSecretEncrypted!: string | null;

  @Column({ name: 'enabled_at', type: 'timestamp', nullable: true })
  enabledAt!: Date | null;

  @Column({ name: 'last_used_step', type: 'integer', nullable: true })
  lastUsedStep!: number | null;

  @Column({ name: 'failed_attempts', type: 'integer', default: 0 })
  failedAttempts!: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
