import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('rate_limit_buckets')
export class RateLimitBucket {
  @PrimaryColumn() scope: string;
  @PrimaryColumn() keyHash: string;
  @Column({ type: 'integer', default: 0 }) count: number;
  @Column({ type: 'timestamp' }) resetAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
