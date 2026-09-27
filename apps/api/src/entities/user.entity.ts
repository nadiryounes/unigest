import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Student } from './student.entity';
import { Teacher } from './teacher.entity';

export enum UserRole {
  ADMIN = 'ADMIN',
  SCOLARITE = 'SCOLARITE',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) email: string;
  @Column() passwordHash: string;
  @Column() firstName: string;
  @Column() lastName: string;
  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT }) role: UserRole;
  @Column({ default: true }) active: boolean;
  @Column({ type: 'int', default: 0 }) tokenVersion: number;
  @Column({ type: 'int', default: 0 }) failedLoginAttempts: number;
  @Column({ type: 'timestamptz', nullable: true }) lockedUntil?: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) passwordChangedAt?: Date | null;

  @OneToOne(() => Student, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'studentProfileId' })
  studentProfile?: Student;

  @OneToOne(() => Teacher, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'teacherProfileId' })
  teacherProfile?: Teacher;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
