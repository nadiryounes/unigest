import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Candidate } from './candidate.entity';
import { Application } from './application.entity';

@Entity('candidate_documents')
export class CandidateDocument {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() type: string;
  @Column() originalName: string;
  @Column() storageKey: string;
  @Column() mimeType: string;
  @Column({ type: 'int' }) size: number;
  @Column({ default: 'RECEIVED' }) status: string;
  @Column({ nullable: true }) reviewNote?: string;
  @ManyToOne(() => Candidate, (candidate) => candidate.documents, { eager: true, onDelete: 'CASCADE' }) candidate: Candidate;
  @ManyToOne(() => Application, (application) => application.documents, { eager: true, onDelete: 'CASCADE' }) application: Application;
  @CreateDateColumn() uploadedAt: Date;
}
