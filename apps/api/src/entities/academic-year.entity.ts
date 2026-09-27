import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Enrollment } from './enrollment.entity';
import { StudentGroup } from './student-group.entity';
import { Assessment } from './assessment.entity';
import { ApplicationCampaign } from './application-campaign.entity';

@Entity('academic_years')
export class AcademicYear {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) label: string;
  @Column({ type: 'date' }) startsOn: string;
  @Column({ type: 'date' }) endsOn: string;
  @Column({ default: false }) active: boolean;
  @OneToMany(() => Enrollment, (enrollment) => enrollment.academicYear) enrollments: Enrollment[];
  @OneToMany(() => StudentGroup, (group) => group.academicYear) groups: StudentGroup[];
  @OneToMany(() => Assessment, (assessment) => assessment.academicYear) assessments: Assessment[];
  @OneToMany(() => ApplicationCampaign, (campaign) => campaign.academicYear) applicationCampaigns: ApplicationCampaign[];
}
