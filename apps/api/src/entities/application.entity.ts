import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, Unique } from 'typeorm';
import { Candidate } from './candidate.entity';
import { ApplicationCampaign } from './application-campaign.entity';
import { Program } from './program.entity';
import { CandidateDocument } from './candidate-document.entity';

export enum ApplicationStatus { SUBMITTED='SUBMITTED', INELIGIBLE='INELIGIBLE', ELIGIBLE='ELIGIBLE', SHORTLISTED='SHORTLISTED', WAITLISTED='WAITLISTED', ADMITTED='ADMITTED', REJECTED='REJECTED', ENROLLED='ENROLLED' }

@Entity('applications')
@Unique(['applicationNumber'])
@Unique(['candidate', 'campaign', 'program'])
export class Application {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() applicationNumber: string;
  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.SUBMITTED }) status: ApplicationStatus;
  @Column({ type: 'float', nullable: true }) score?: number;
  @Column({ type: 'text', nullable: true }) decisionNote?: string;
  @Column({ type: 'jsonb', nullable: true }) formData?: Record<string, unknown>;
  @ManyToOne(() => Candidate, (candidate) => candidate.applications, { eager: true, onDelete: 'CASCADE' }) candidate: Candidate;
  @ManyToOne(() => ApplicationCampaign, (campaign) => campaign.applications, { eager: true, onDelete: 'CASCADE' }) campaign: ApplicationCampaign;
  @ManyToOne(() => Program, { eager: true, onDelete: 'CASCADE' }) program: Program;
  @OneToMany(() => CandidateDocument, (document) => document.application) documents: CandidateDocument[];
  @CreateDateColumn() submittedAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
