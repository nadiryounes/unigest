import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ nullable: true }) actorUserId?: string;
  @Column({ nullable: true }) actorEmail?: string;
  @Column({ nullable: true }) actorRole?: string;
  @Column() method: string;
  @Column() path: string;
  @Column() action: string;
  @Column() resource: string;
  @Column({ nullable: true }) resourceId?: string;
  @Column({ type: 'jsonb', nullable: true }) details?: Record<string, unknown>;
  @Column({ nullable: true }) ip?: string;
  @Column({ default: true }) success: boolean;
  @Column({ nullable: true }) errorMessage?: string;
  @CreateDateColumn() createdAt: Date;
}
