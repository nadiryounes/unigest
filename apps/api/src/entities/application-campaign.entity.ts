import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AcademicYear } from './academic-year.entity';
import { Application } from './application.entity';
import { Program } from './program.entity';

export enum CampaignStatus { DRAFT='DRAFT', OPEN='OPEN', CLOSED='CLOSED', ARCHIVED='ARCHIVED' }

@Entity('application_campaigns')
export class ApplicationCampaign {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ type: 'date' }) startsOn: string;
  @Column({ type: 'date' }) endsOn: string;
  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.DRAFT }) status: CampaignStatus;
  @Column({ type: 'jsonb', nullable: true }) eligibilityRules?: Record<string, unknown>;
  @ManyToOne(() => AcademicYear, { eager: true, onDelete: 'CASCADE' }) academicYear: AcademicYear;
  @ManyToMany(() => Program, { eager: true })
  @JoinTable({ name: 'application_campaign_programs', joinColumn: { name: 'applicationCampaignId' }, inverseJoinColumn: { name: 'programId' } })
  programs: Program[];
  @OneToMany(() => Application, (application) => application.campaign) applications: Application[];
}
