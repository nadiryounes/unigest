import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index()
  @Column('uuid') userId: string;
  @Index({ unique: true })
  @Column() tokenHash: string;
  @Column({ type: 'timestamp' }) expiresAt: Date;
  @Column({ type: 'timestamp', nullable: true }) usedAt?: Date;
  @CreateDateColumn() createdAt: Date;
}
