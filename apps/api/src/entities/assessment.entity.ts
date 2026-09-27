import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { AcademicModule } from './academic-module.entity';
import { AcademicYear } from './academic-year.entity';
import { Grade } from './grade.entity';

export enum AssessmentType {
  CONTINUOUS = 'CONTINUOUS',
  EXAM = 'EXAM',
  PROJECT = 'PROJECT',
  RESIT = 'RESIT',
}

@Entity('assessments')
@Unique(['module', 'academicYear', 'name'])
export class Assessment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ type: 'enum', enum: AssessmentType, default: AssessmentType.CONTINUOUS }) type: AssessmentType;
  @Column({ type: 'float', default: 1 }) weight: number;
  @Column({ type: 'float', default: 20 }) maxValue: number;
  @Column({ default: false }) published: boolean;
  @ManyToOne(() => AcademicModule, { eager: true, onDelete: 'CASCADE' }) module: AcademicModule;
  @ManyToOne(() => AcademicYear, (year) => year.assessments, { eager: true, onDelete: 'CASCADE' }) academicYear: AcademicYear;
  @OneToMany(() => Grade, (grade) => grade.assessment) grades: Grade[];
}
