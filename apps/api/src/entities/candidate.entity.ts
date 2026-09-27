import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Application } from './application.entity';
import { CandidateDocument } from './candidate-document.entity';

@Entity('candidates')
export class Candidate {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() firstName: string;
  @Column() lastName: string;
  @Column() email: string;
  @Column({ nullable: true }) phone?: string;
  @Column({ nullable: true }) nationalId?: string;
  @Column({ type: 'date', nullable: true }) birthDate?: string;
  @Column({ nullable: true }) city?: string;
  @CreateDateColumn() createdAt: Date;
  @OneToMany(() => Application, (application) => application.candidate) applications: Application[];
  @OneToMany(() => CandidateDocument, (document) => document.candidate) documents: CandidateDocument[];
}
