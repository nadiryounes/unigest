import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_security')
export class UserSecurity {
  @PrimaryColumn('uuid') userId: string;
  @Column({ default: false }) mfaEnabled: boolean;
  @Column({ type: 'text', nullable: true }) mfaSecretEncrypted?: string | null;
  @Column({ type: 'jsonb', nullable: true }) recoveryCodeHashes?: string[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
